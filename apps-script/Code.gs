const CAREATLAS_ROOT_NAME = 'CareAtlas Patients';
const MEDICAL_REPORTS_FOLDER = 'Medical Reports';
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
];

function doGet() {
  const template = HtmlService.createTemplateFromFile('Bridge');
  template.allowedOrigins = JSON.stringify(getAllowedOrigins_());
  return template.evaluate()
    .setTitle('CareAtlas Document Gateway')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupCareAtlasDrive() {
  const root = getRootFolder_();
  return {
    rootFolderId: root.getId(),
    rootFolderName: root.getName()
  };
}

function getGatewayStatus() {
  const props = PropertiesService.getScriptProperties();
  return {
    firebaseProjectId: props.getProperty('FIREBASE_PROJECT_ID') || '',
    hasFirebaseApiKey: Boolean(props.getProperty('FIREBASE_API_KEY')),
    rootFolderId: props.getProperty('DRIVE_ROOT_FOLDER_ID') || '',
    allowedOrigins: getAllowedOrigins_()
  };
}

function handleBridgeRequest(request) {
  if (!request || !request.action) {
    throw new Error('Missing document gateway action.');
  }

  const payload = request.payload || {};

  switch (request.action) {
    case 'health':
      return getGatewayStatus();
    case 'upload':
      return uploadDocument_(payload);
    case 'download':
      return downloadDocument_(payload);
    case 'delete':
      return deleteDocument_(payload);
    default:
      throw new Error('Unsupported document gateway action.');
  }
}

function uploadDocument_(payload) {
  const user = verifyFirebaseUser_(payload.idToken);
  const caseDoc = getFirestoreDocument_('cases/' + requireSafeId_(payload.caseId, 'caseId'), payload.idToken);
  const caseData = firestoreFieldsToObject_(caseDoc.fields || {});

  if (caseData.patientId !== user.localId) {
    throw new Error('This case does not belong to the signed-in patient.');
  }

  const rawBytes = Utilities.base64Decode(payload.base64 || '');
  if (!rawBytes.length) throw new Error('The selected file is empty.');
  if (rawBytes.length > MAX_FILE_BYTES) throw new Error('Files must be 8 MB or smaller for the CareAtlas MVP.');

  const mimeType = String(payload.mimeType || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.indexOf(mimeType) === -1) {
    throw new Error('Only PDF, JPG and PNG files are supported.');
  }

  const safeFileName = sanitizeFileName_(payload.fileName || 'medical-document');
  const caseNumber = sanitizeFolderName_(caseData.caseNumber || payload.caseNumber || payload.caseId);
  const root = getRootFolder_();
  const caseFolder = getOrCreateChildFolder_(root, caseNumber);
  const medicalFolder = getOrCreateChildFolder_(caseFolder, MEDICAL_REPORTS_FOLDER);
  const blob = Utilities.newBlob(rawBytes, mimeType, safeFileName);
  const file = medicalFolder.createFile(blob);
  const accessKey = Utilities.getUuid() + '-' + Utilities.getUuid();

  file.setDescription(JSON.stringify({
    system: 'careatlas',
    patientId: user.localId,
    caseId: payload.caseId,
    accessKey: accessKey
  }));

  return {
    driveFileId: file.getId(),
    driveAccessKey: accessKey,
    name: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    caseFolderId: caseFolder.getId(),
    storedAt: new Date().toISOString()
  };
}

function downloadDocument_(payload) {
  const user = verifyFirebaseUser_(payload.idToken);
  const metadata = getDocumentMetadata_(payload.documentId, payload.idToken);
  authorizeDocumentRead_(metadata, user, payload.idToken);

  const file = DriveApp.getFileById(metadata.driveFileId);
  verifyDriveCapability_(file, metadata);
  const blob = file.getBlob();

  return {
    name: metadata.name || file.getName(),
    mimeType: metadata.mimeType || file.getMimeType(),
    size: file.getSize(),
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

function deleteDocument_(payload) {
  const user = verifyFirebaseUser_(payload.idToken);
  const metadata = getDocumentMetadata_(payload.documentId, payload.idToken);
  verifyPatientOwnsMetadata_(metadata, user.localId);

  const file = DriveApp.getFileById(metadata.driveFileId);
  verifyDriveCapability_(file, metadata);
  file.setTrashed(true);

  return { deleted: true, driveFileId: metadata.driveFileId };
}

function getDocumentMetadata_(documentId, idToken) {
  const document = getFirestoreDocument_('caseDocuments/' + requireSafeId_(documentId, 'documentId'), idToken);
  return firestoreFieldsToObject_(document.fields || {});
}

function verifyPatientOwnsMetadata_(metadata, uid) {
  if (!metadata || metadata.patientId !== uid) {
    throw new Error('Only the patient who uploaded this document can remove it.');
  }
  if (!metadata.driveFileId || !metadata.driveAccessKey) {
    throw new Error('This document record is incomplete.');
  }
}

function authorizeDocumentRead_(metadata, user, idToken) {
  if (!metadata || !metadata.driveFileId || !metadata.driveAccessKey || !metadata.caseId) {
    throw new Error('This document record is incomplete.');
  }

  if (metadata.patientId === user.localId) return;

  const userDoc = getFirestoreDocument_('users/' + requireSafeId_(user.localId, 'userId'), idToken);
  const profile = firestoreFieldsToObject_(userDoc.fields || {});
  const role = profile.role || '';

  if (['careatlas_coordinator', 'careatlas_operations', 'careatlas_admin', 'super_admin'].indexOf(role) !== -1) {
    return;
  }

  if (['hospital_admin', 'hospital_doctor', 'hospital_coordinator'].indexOf(role) !== -1 && profile.hospitalId) {
    const caseDoc = getFirestoreDocument_('cases/' + requireSafeId_(metadata.caseId, 'caseId'), idToken);
    const caseData = firestoreFieldsToObject_(caseDoc.fields || {});
    const assigned = Array.isArray(caseData.assignedHospitalIds) ? caseData.assignedHospitalIds : [];
    if (assigned.indexOf(profile.hospitalId) !== -1) return;
  }

  throw new Error('You do not have access to this medical document.');
}

function verifyDriveCapability_(file, metadata) {
  let description;
  try {
    description = JSON.parse(file.getDescription() || '{}');
  } catch (error) {
    throw new Error('The Drive document security marker is invalid.');
  }

  if (
    description.system !== 'careatlas' ||
    description.patientId !== metadata.patientId ||
    description.caseId !== metadata.caseId ||
    description.accessKey !== metadata.driveAccessKey
  ) {
    throw new Error('The document security check failed.');
  }
}

function verifyFirebaseUser_(idToken) {
  if (!idToken) throw new Error('A Firebase session is required.');
  const apiKey = requireProperty_('FIREBASE_API_KEY');
  const response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error('Your CareAtlas session could not be verified. Please sign in again.');
  }

  const body = JSON.parse(response.getContentText() || '{}');
  if (!body.users || !body.users.length || !body.users[0].localId) {
    throw new Error('No Firebase user was found for this session.');
  }
  return body.users[0];
}

function getFirestoreDocument_(documentPath, idToken) {
  const projectId = requireProperty_('FIREBASE_PROJECT_ID');
  const url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) +
    '/databases/(default)/documents/' + documentPath;

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + idToken },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('The requested CareAtlas record could not be accessed.');
  }
  return JSON.parse(response.getContentText());
}

function firestoreFieldsToObject_(fields) {
  const result = {};
  Object.keys(fields || {}).forEach(function(key) {
    result[key] = firestoreValue_(fields[key]);
  });
  return result;
}

function firestoreValue_(value) {
  if (!value) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return Boolean(value.booleanValue);
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (value.timestampValue) return value.timestampValue;
  if (value.arrayValue) return (value.arrayValue.values || []).map(firestoreValue_);
  if (value.mapValue) return firestoreFieldsToObject_(value.mapValue.fields || {});
  return null;
}

function getRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty('DRIVE_ROOT_FOLDER_ID');
  if (existingId) {
    try {
      return DriveApp.getFolderById(existingId);
    } catch (error) {
      props.deleteProperty('DRIVE_ROOT_FOLDER_ID');
    }
  }

  const folder = DriveApp.createFolder(CAREATLAS_ROOT_NAME);
  props.setProperty('DRIVE_ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function getOrCreateChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function getAllowedOrigins_() {
  const configured = PropertiesService.getScriptProperties().getProperty('ALLOWED_ORIGINS') || '';
  const origins = configured.split(',').map(function(item) { return item.trim(); }).filter(Boolean);
  if (origins.length) return origins;
  return [
    'http://localhost:3000',
    'https://anshaysingh29-max.github.io'
  ];
}

function requireProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('Missing Apps Script property: ' + name);
  return value;
}

function requireSafeId_(value, fieldName) {
  const safe = String(value || '').trim();
  if (!safe || !/^[A-Za-z0-9_-]+$/.test(safe)) {
    throw new Error('Invalid ' + fieldName + '.');
  }
  return safe;
}

function sanitizeFolderName_(value) {
  return String(value || 'CareAtlas Case').replace(/[\\/:*?"<>|]/g, '-').slice(0, 100);
}

function sanitizeFileName_(value) {
  return String(value || 'medical-document')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .slice(0, 160);
}
