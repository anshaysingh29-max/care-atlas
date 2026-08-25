'use client';

import { useEffect } from 'react';
import { captureReferralFromLocation } from '@/lib/firebase/referrals';

export default function ReferralCapture() {
  useEffect(() => {
    captureReferralFromLocation().catch(error => console.error('Could not capture CareAtlas referral attribution.', error));
  }, []);
  return null;
}
