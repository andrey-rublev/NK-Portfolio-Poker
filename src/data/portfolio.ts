export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'

export interface CardAction {
  label: string
  href: string
}

export interface PortfolioCardData {
  id: string
  label: string
  title: string
  teaser: string
  detail: string
  bullets: string[]
  tags: string[]
  accent: string
  suit: Suit
  rank: string
  actions?: CardAction[]
}

export interface TableSeatData {
  id: string
  position: {
    desktop: {
      left: string
      top: string
      rotate: number
    }
    mobile: {
      left: string
      top: string
      rotate: number
    }
  }
  cards: [PortfolioCardData, PortfolioCardData]
}

export const tableSeats: TableSeatData[] = [
  {
    id: 'seat-southwest',
    position: {
      desktop: { left: '26%', top: '73%', rotate: -16 },
      mobile: { left: '23%', top: '73%', rotate: -18 },
    },
    cards: [
      {
        id: 'hobbies',
        label: 'Hobbies',
        title: 'Outside the Code',
        teaser: 'Tennis, robotics, volunteering, camping, exploring, and tinkering.',
        detail:
          'A lot of the energy behind the work comes from staying curious outside of software too.',
        bullets: [
          'Enjoys tennis, robotics, programming, volunteering, camping, exploring, and hands-on experimentation.',
          'Scouting and high-adventure experiences built leadership, resilience, and teamwork.',
          'Tinkering is a constant habit, whether the medium is code, hardware, strategy, or an idea worth testing.',
        ],
        tags: ['Tennis', 'Robotics', 'Camping', 'Tinkering'],
        accent: '#7fe0a9',
        suit: 'clubs',
        rank: '6',
      },
      {
        id: 'contact',
        label: 'Contact',
        title: 'Reach Out',
        teaser: 'Email, call, or connect on LinkedIn for projects, internships, or ideas.',
        detail:
          'Open to ambitious conversations around software, AI, research, internships, and building useful things.',
        bullets: [
          'Email: nikhilkolli1@gmail.com',
          'Phone: (346) 457-8061',
          'Location: Katy, Texas, United States',
        ],
        tags: ['LinkedIn', 'Internships', 'Collaboration'],
        accent: '#ff9178',
        suit: 'hearts',
        rank: '5',
        actions: [
          { label: 'Email', href: 'mailto:nikhilkolli1@gmail.com' },
          { label: 'LinkedIn', href: 'https://linkedin.com/in/nikhilxkolli' },
          { label: 'Call', href: 'tel:+13464578061' },
        ],
      },
    ],
  },
  {
    id: 'seat-northwest',
    position: {
      desktop: { left: '24%', top: '28%', rotate: -12 },
      mobile: { left: '22%', top: '26%', rotate: -14 },
    },
    cards: [
      {
        id: 'about',
        label: 'About',
        title: 'Who I Am',
        teaser: 'Product-minded engineer with a strong interest in AI and machine learning.',
        detail:
          'Aspiring computer engineering student at Purdue with a strong foundation in software, problem solving, and building technology that feels useful in the real world.',
        bullets: [
          'Focused on computer engineering with a strong interest in artificial intelligence, machine learning, and user-first software.',
          'Combines technical curiosity with execution, from interfaces to backend systems and research workflows.',
          'Driven by experimentation, continuous learning, and building ideas that go beyond demos.',
        ],
        tags: ['Purdue', 'AI', 'ML', 'Product Thinking'],
        accent: '#7dc5ff',
        suit: 'spades',
        rank: 'A',
      },
      {
        id: 'education',
        label: 'Education',
        title: 'Academic Record',
        teaser: 'Computer Engineering at Purdue with a strong STEM foundation behind it.',
        detail:
          'Academic performance reflects consistency, rigor, and a strong base for deeper work in engineering and software.',
        bullets: [
          'Purdue University, Bachelor of Engineering in Computer Engineering, expected May 2029.',
          'Current undergraduate GPA: 3.93.',
          'Tompkins High School graduate with a 4.6154 weighted GPA and class rank of 67 out of 725.',
        ],
        tags: ['Purdue', '3.93 GPA', 'STEM'],
        accent: '#6ddbcf',
        suit: 'clubs',
        rank: '8',
      },
    ],
  },
  {
    id: 'seat-north',
    position: {
      desktop: { left: '50%', top: '18%', rotate: -2 },
      mobile: { left: '50%', top: '18%', rotate: -2 },
    },
    cards: [
      {
        id: 'work',
        label: 'Experience',
        title: 'RealTalk Labs',
        teaser: 'Co-Founder building an AI hiring assistant and job application manager.',
        detail:
          'Built the MVP for RealTalk Labs with a mix of frontend execution, backend integration, and AI-focused product thinking.',
        bullets: [
          'Developed the front end using TypeScript, React, and Vite in VS Code.',
          'Worked with FastAPI, AWS, NLTK, OpenAI API, Whisper, and MySQL to support the product stack.',
          'Helped shape custom AI features for resume review, interview improvement, and grounded career feedback.',
        ],
        tags: ['React', 'TypeScript', 'FastAPI', 'AWS'],
        accent: '#ff8e79',
        suit: 'hearts',
        rank: 'K',
      },
      {
        id: 'projects',
        label: 'Projects',
        title: 'What I Build',
        teaser: 'Quantum experiments, student products, and robotics systems.',
        detail:
          'Projects span research-heavy work and shipped student tools, showing range across software, mobile, and robotics.',
        bullets: [
          'Built a hybrid quantum-classical decoding system for encoded text using Python, PyTorch, and PennyLane.',
          'Led Gradus, an academic progress tracking app built with Flutter and Dart/Python, with beta usage in 176 countries and regions.',
          'Worked on FRC 5427 Steel Talons software, including vision tracking to improve autonomous performance.',
        ],
        tags: ['Flutter', 'Dart', 'Robotics', 'Python'],
        accent: '#f1c164',
        suit: 'diamonds',
        rank: 'J',
      },
    ],
  },
  {
    id: 'seat-northeast',
    position: {
      desktop: { left: '76%', top: '28%', rotate: 12 },
      mobile: { left: '78%', top: '26%', rotate: 14 },
    },
    cards: [
      {
        id: 'research',
        label: 'Research',
        title: 'Quantum Computing',
        teaser: 'Hybrid quantum-classical modeling at Purdue in the Datamine Physics cohort.',
        detail:
          'Research centered on noise mitigation, simulation reliability, and quantum machine learning for encoded text classification and decryption.',
        bullets: [
          'Developed PennyLane simulations to study noise in NISQ systems and improve the accuracy of ground-state energy estimates.',
          'Applied zero-noise extrapolation with linear and quadratic regression to make simulations more reliable.',
          'Built and trained hybrid PyTorch plus quantum models on 4M+ cipher samples for classification and decoding tasks.',
        ],
        tags: ['PennyLane', 'PyTorch', 'Quantum ML', 'Cryptography'],
        accent: '#84e4a8',
        suit: 'clubs',
        rank: 'Q',
      },
      {
        id: 'skills',
        label: 'Skills',
        title: 'Technical Stack',
        teaser: 'Languages, frameworks, tooling, and research-ready engineering skills.',
        detail:
          'Strong breadth across programming, full-stack development, mobile, cloud, analytics, and emerging quantum workflows.',
        bullets: [
          'Languages: Java, Python, Dart, TypeScript, R, C, and MATLAB.',
          'Tools and frameworks: React, Vite, Flutter, FastAPI, GitHub, AWS, MySQL, and Android Studio.',
          'Domains: AI, data analysis, web design, mobile development, programming fundamentals, and quantum computing.',
        ],
        tags: ['Java', 'Python', 'React', 'Flutter'],
        accent: '#86b7ff',
        suit: 'spades',
        rank: '10',
      },
    ],
  },
  {
    id: 'seat-southeast',
    position: {
      desktop: { left: '74%', top: '73%', rotate: 16 },
      mobile: { left: '77%', top: '73%', rotate: 18 },
    },
    cards: [
      {
        id: 'certifications',
        label: 'Certifications',
        title: 'Credentials',
        teaser: 'Cloud and analytics certifications that reinforce technical practice.',
        detail:
          'Formal certifications support the hands-on work, especially in cloud foundations and data-driven thinking.',
        bullets: [
          'AWS Certified Cloud Practitioner, issued May 2025 and valid through May 2028.',
          'Google Data Analytics Professional Certificate, issued November 2023.',
          'Strong alignment between certification topics and practical work in cloud-backed software systems.',
        ],
        tags: ['AWS', 'Google Data Analytics', 'Cloud'],
        accent: '#ff97af',
        suit: 'hearts',
        rank: '9',
      },
      {
        id: 'awards',
        label: 'Awards',
        title: 'Recognition',
        teaser: 'Academic, athletic, and service-driven honors across multiple paths.',
        detail:
          'The award record reflects leadership, endurance, academic strength, and long-term commitment outside the classroom too.',
        bullets: [
          'Team Tennis Academic All-State First Team and National Merit Scholarship Commendation.',
          'Eagle Scout with 42 merit badges, extensive service hours, and leadership roles in scouting.',
          'Triple Crown High Adventure Award with major expeditions across Canada, New Mexico, and the Bahamas.',
        ],
        tags: ['Eagle Scout', 'National Merit', 'Academic All-State'],
        accent: '#ffcb78',
        suit: 'diamonds',
        rank: '7',
      },
    ],
  },
]
