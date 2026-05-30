// Docker-style Random Name Generator
// Combines a random adjective and a famous scientist/historical figure.

const ADJECTIVES = [
  'admiring', 'adoring', 'affectionate', 'agitated', 'amazing', 'angry', 'awesome', 'beautiful',
  'blissful', 'bold', 'boring', 'busy', 'charming', 'clever', 'cool', 'compassionate',
  'competent', 'condescending', 'confident', 'cranky', 'crazy', 'dazzling', 'determined',
  'distracted', 'dreamy', 'eager', 'ecstatic', 'elastic', 'elated', 'elegant', 'eloquent',
  'epic', 'exciting', 'fervent', 'festive', 'flamboyant', 'focused', 'friendly', 'frosty',
  'funny', 'gallant', 'gifted', 'goofy', 'gracious', 'great', 'happy', 'hardcore', 'heuristic',
  'hopeful', 'hungry', 'infallible', 'inspiring', 'interesting', 'jolly', 'jovial', 'keen',
  'kind', 'laughing', 'loving', 'lucid', 'magical', 'mystifying', 'modest', 'musing',
  'naughty', 'nervous', 'nice', 'nifty', 'nostalgic', 'objective', 'optimistic', 'peaceful',
  'pedantic', 'pensive', 'practical', 'priceless', 'quirky', 'quizzical', 'rebellious',
  'reciprocating', 'relaxed', 'reverent', 'romantic', 'sad', 'serene', 'sharp', 'silly',
  'sleepy', 'solemn', 'stoic', 'stranger', 'stupefied', 'suspicious', 'sweet', 'tender',
  'thirsty', 'trusting', 'unruffled', 'upbeat', 'vibrant', 'vigilant', 'vigorous', 'wacky',
  'weary', 'wild', 'witty', 'wonderful', 'zealous', 'zen'
];

const NAMES = [
  'albattani', 'allen', 'almeida', 'antonelli', 'archimedes', 'aras', 'babbage', 'bardeen',
  'bartik', 'bassi', 'beaver', 'bell', 'benz', 'bhabha', 'bhaskara', 'blackwell', 'bohr',
  'booth', 'borg', 'bose', 'bouman', 'boyd', 'brin', 'brown', 'carson', 'cartwright',
  'chandrasekhar', 'chaplygin', 'chatelet', 'chatterjee', 'chebyshev', 'clarke', 'cohen',
  'copernicus', 'cray', 'curie', 'darwin', 'davinci', 'dewdney', 'dijkstra', 'dirac',
  'dixon', 'davis', 'dongarra', 'dorothy', 'easley', 'edison', 'einstein', 'elion', 'ellis',
  'engelbart', 'euclid', 'euler', 'feynman', 'fermat', 'fermi', 'franklin', 'galileo',
  'gates', 'gauss', 'germain', 'goldberg', 'goldwasser', 'goldstine', 'goodall', 'gould',
  'greider', 'grothendieck', 'haibt', 'hamilton', 'harriot', 'haslett', 'hawking', 'heisenberg',
  'hellman', 'hermann', 'herschel', 'hertz', 'hinton', 'hobbs', 'hodgkin', 'hofstadter',
  'hoover', 'hopper', 'horney', 'hughely', 'hypatia', 'ishizaka', 'jackson', 'jang', 'jensen',
  'jobs', 'joliot', 'jones', 'kalam', 'kapitsa', 'kare', 'karman', 'karp', 'keller', 'kelvin',
  'kemper', 'khorana', 'kilby', 'kirch', 'knuth', 'kowalevski', 'lalande', 'lamarr', 'lamport',
  'leakey', 'leavitt', 'lederberg', 'leibniz', 'lewin', 'lichterman', 'liskov', 'lovelace',
  'lumiere', 'mahavira', 'margulis', 'matsumoto', 'maxwell', 'mayer', 'mccarthy', 'mcclintock',
  'mclean', 'mcnulty', 'meitner', 'mendel', 'mendeleev', 'merian', 'mersenne', 'michelson',
  'milankovic', 'minsky', 'mirzakhani', 'moore', 'morse', 'moser', 'murdock', 'musk', 'neumann',
  'newton', 'nightingale', 'nobel', 'noether', 'novikov', 'ockham', 'page', 'panini', 'parnas',
  'pascal', 'pasteur', 'patel', 'payne', 'peano', 'perlman', 'picard', 'pingree', 'planck',
  'poincare', 'poitras', 'pratley', 'proskuriakova', 'ptolemy', 'raman', 'ramanujan', 'ride',
  'riemann', 'ritchie', 'robinson', 'roentgen', 'rosalind', 'rubin', 'saha', 'sammet', 'sandberg',
  'sanger', 'santos', 'schrodinger', 'schwerin', 'seacole', 'secchi', 'shannon', 'shaw',
  'shirley', 'shockley', 'shostak', 'sinoussi', 'snyder', 'solomon', 'somerville', 'spence',
  'stonebraker', 'sutherland', 'swanson', 'swartz', 'swirles', 'taussig', 'tereshkova',
  'tesla', 'theano', 'thomas', 'thompson', 'torvalds', 'turing', 'varahamihira', 'vaughan',
  'vesalius', 'visvesvaraya', 'volhard', 'volter', 'vonnegut', 'wagner', 'ward', 'watson',
  'weierstrass', 'weisskopf', 'wescoff', 'wilkes', 'wilkinson', 'williams', 'wilson', 'wing',
  'wozniak', 'wright', 'wu', 'yalow', 'yang', 'yazdi', 'yonath', 'zhang', 'zuse'
];

export function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  
  // Exception to avoid generating "boring_wozniak" (as Docker famously does)
  if (adj === 'boring' && name === 'wozniak') {
    return 'creative_wozniak';
  }
  
  return `${adj}_${name}`;
}
