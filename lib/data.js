export const treatments = [
  {
    slug: 'knee-replacement',
    name: 'Knee Replacement',
    category: 'Orthopedics',
    summary: 'Compare leading orthopedic teams for total and partial knee replacement.',
    startingPrice: '$4,500',
    stay: '14–21 days',
    icon: '🦵',
    destinations: ['india', 'turkey', 'thailand']
  },
  {
    slug: 'cardiac-surgery',
    name: 'Cardiac Surgery',
    category: 'Cardiology',
    summary: 'International cardiac centers for bypass, valve and minimally invasive surgery.',
    startingPrice: '$7,200',
    stay: '14–24 days',
    icon: '🫀',
    destinations: ['india', 'uae', 'thailand']
  },
  {
    slug: 'ivf-fertility',
    name: 'IVF & Fertility',
    category: 'Fertility',
    summary: 'Explore fertility specialists, IVF programs and transparent treatment pathways.',
    startingPrice: '$3,800',
    stay: '14–28 days',
    icon: '🧬',
    destinations: ['india', 'turkey', 'thailand']
  },
  {
    slug: 'oncology',
    name: 'Cancer Care',
    category: 'Oncology',
    summary: 'Multidisciplinary cancer care with surgery, radiation and systemic treatment options.',
    startingPrice: '$6,500',
    stay: 'Varies',
    icon: '🎗️',
    destinations: ['india', 'uae', 'thailand']
  },
  {
    slug: 'spine-surgery',
    name: 'Spine Surgery',
    category: 'Neurology & Orthopedics',
    summary: 'Specialist evaluation for decompression, fusion and minimally invasive spine surgery.',
    startingPrice: '$5,900',
    stay: '12–20 days',
    icon: '🩻',
    destinations: ['india', 'turkey']
  },
  {
    slug: 'dental-implants',
    name: 'Dental Implants',
    category: 'Dental',
    summary: 'Implant dentistry, full-mouth rehabilitation and cosmetic dental care abroad.',
    startingPrice: '$650',
    stay: '5–10 days',
    icon: '🦷',
    destinations: ['turkey', 'thailand', 'india']
  }
];

export const destinations = [
  {
    slug: 'india',
    name: 'India',
    flag: '🇮🇳',
    city: 'Delhi · Mumbai · Chennai · Bengaluru',
    intro: 'High-complexity medical care, experienced specialists and strong international patient programs.',
    highlight: 'Best for cardiac, oncology, orthopedics and complex procedures',
    costIndex: 'High value',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'turkey',
    name: 'Turkey',
    flag: '🇹🇷',
    city: 'Istanbul · Ankara · Antalya',
    intro: 'A major medical travel hub combining modern hospitals with convenient access from Europe and MENA.',
    highlight: 'Best for dental, cosmetic, hair restoration and selected surgery',
    costIndex: 'Mid-range',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'thailand',
    name: 'Thailand',
    flag: '🇹🇭',
    city: 'Bangkok · Phuket · Chiang Mai',
    intro: 'Premium private healthcare with strong hospitality, recovery and international patient services.',
    highlight: 'Best for wellness, orthopedics, dental and premium recovery',
    costIndex: 'Mid-range',
    image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'uae',
    name: 'UAE',
    flag: '🇦🇪',
    city: 'Dubai · Abu Dhabi',
    intro: 'Premium healthcare, fast international connectivity and multilingual specialist services.',
    highlight: 'Best for premium diagnostics, surgery and specialist consultations',
    costIndex: 'Premium',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85'
  }
];

export const doctors = [
  {
    slug: 'dr-arjun-mehta',
    name: 'Dr. Arjun Mehta',
    title: 'Senior Consultant · Joint Replacement',
    hospital: 'Aster Nova Institute',
    hospitalSlug: 'aster-nova-institute',
    location: 'New Delhi, India',
    experience: '24 years',
    languages: ['English', 'Hindi'],
    specialties: ['Robotic Knee Replacement', 'Hip Replacement', 'Sports Orthopedics'],
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=700&q=85'
  },
  {
    slug: 'dr-selin-kaya',
    name: 'Dr. Selin Kaya',
    title: 'Consultant · Reconstructive & Cosmetic Surgery',
    hospital: 'Bosporus Medical Centre',
    hospitalSlug: 'bosporus-medical-centre',
    location: 'Istanbul, Turkey',
    experience: '18 years',
    languages: ['English', 'Turkish', 'German'],
    specialties: ['Reconstructive Surgery', 'Body Contouring', 'Facial Surgery'],
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=700&q=85'
  },
  {
    slug: 'dr-narin-suvit',
    name: 'Dr. Narin Suvit',
    title: 'Consultant · Cardiac Surgery',
    hospital: 'Siam International Hospital',
    hospitalSlug: 'siam-international-hospital',
    location: 'Bangkok, Thailand',
    experience: '21 years',
    languages: ['English', 'Thai'],
    specialties: ['CABG', 'Valve Surgery', 'Minimally Invasive Cardiac Surgery'],
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=700&q=85'
  }
];

export const hospitals = [
  {
    slug: 'aster-nova-institute',
    name: 'Aster Nova Institute',
    city: 'New Delhi',
    country: 'India',
    flag: '🇮🇳',
    rating: '4.8',
    reviews: '1,240',
    response: '< 12 hrs',
    verified: true,
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1400&q=85',
    specialties: ['Orthopedics', 'Cardiology', 'Oncology', 'Neurology'],
    accreditations: ['International quality accreditation', 'National hospital accreditation'],
    metrics: [
      ['35+ years', 'Clinical legacy'],
      ['60+', 'Specialties'],
      ['900+', 'Beds'],
      ['80+ countries', 'Patients served']
    ],
    services: ['Visa invitation assistance', 'Airport transfer coordination', 'Interpreter support', 'Accommodation assistance', 'Teleconsultation'],
    price: '$4,500',
    doctorSlugs: ['dr-arjun-mehta']
  },
  {
    slug: 'bosporus-medical-centre',
    name: 'Bosporus Medical Centre',
    city: 'Istanbul',
    country: 'Turkey',
    flag: '🇹🇷',
    rating: '4.7',
    reviews: '940',
    response: '< 8 hrs',
    verified: true,
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1400&q=85',
    specialties: ['Cosmetic Surgery', 'Dental', 'Orthopedics', 'ENT'],
    accreditations: ['International quality accreditation'],
    metrics: [
      ['24+ years', 'Clinical legacy'],
      ['42+', 'Specialties'],
      ['520+', 'Beds'],
      ['65+ countries', 'Patients served']
    ],
    services: ['Airport pickup', 'Interpreter support', 'Hotel coordination', 'Dedicated international desk', 'Teleconsultation'],
    price: '$3,900',
    doctorSlugs: ['dr-selin-kaya']
  },
  {
    slug: 'siam-international-hospital',
    name: 'Siam International Hospital',
    city: 'Bangkok',
    country: 'Thailand',
    flag: '🇹🇭',
    rating: '4.9',
    reviews: '1,680',
    response: '< 10 hrs',
    verified: true,
    image: 'https://images.unsplash.com/photo-1516841273335-e39b37888115?auto=format&fit=crop&w=1400&q=85',
    specialties: ['Cardiology', 'Orthopedics', 'Health Checkups', 'Dental'],
    accreditations: ['International quality accreditation'],
    metrics: [
      ['30+ years', 'Clinical legacy'],
      ['50+', 'Specialties'],
      ['700+', 'Beds'],
      ['100+ countries', 'Patients served']
    ],
    services: ['Premium patient lounge', 'Airport transfer', 'Interpreter support', 'Recovery stay coordination', 'Teleconsultation'],
    price: '$5,600',
    doctorSlugs: ['dr-narin-suvit']
  },
  {
    slug: 'harbour-health-dubai',
    name: 'Harbour Health Dubai',
    city: 'Dubai',
    country: 'UAE',
    flag: '🇦🇪',
    rating: '4.8',
    reviews: '730',
    response: '< 6 hrs',
    verified: true,
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=85',
    specialties: ['Cardiology', 'Oncology', 'Diagnostics', 'Executive Health'],
    accreditations: ['International quality accreditation', 'Regional clinical excellence program'],
    metrics: [
      ['18+ years', 'Clinical legacy'],
      ['38+', 'Specialties'],
      ['420+', 'Beds'],
      ['55+ countries', 'Patients served']
    ],
    services: ['Visa support', 'Concierge transport', 'Arabic interpreter', 'Hotel coordination', 'Teleconsultation'],
    price: '$8,200',
    doctorSlugs: []
  }
];

export const treatmentCategories = [
  'Cancer Care', 'Cardiology', 'Orthopedics', 'Neurology', 'Spine Surgery',
  'IVF & Fertility', 'Dental', 'Cosmetic Surgery', 'Bariatric Surgery',
  'Ophthalmology', 'Organ Transplant', 'Health Checkups'
];
