/**
 * High-frequency English word bank for typing practice.
 */

const SHORT = [
  'a', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my',
  'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we', 'am', 'ax', 'ad', 'ah', 'id', 'oh',
];

const CORE = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one',
  'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old',
  'see', 'two', 'way', 'who', 'boy', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'man',
  'men', 'run', 'sun', 'set', 'sky', 'sea', 'air', 'ice', 'age', 'ago', 'aid', 'aim', 'arm',
  'art', 'ask', 'bad', 'bag', 'bar', 'bat', 'bay', 'bed', 'big', 'bit', 'box', 'bus', 'buy',
  'car', 'cat', 'cow', 'cry', 'cup', 'cut', 'den', 'dig', 'dog', 'dot', 'dry', 'due', 'ear',
  'eat', 'egg', 'end', 'eye', 'fan', 'far', 'fat', 'fee', 'few', 'fit', 'fix', 'fly', 'fog',
  'fox', 'fun', 'fur', 'gap', 'gas', 'gem', 'got', 'gum', 'gun', 'gut', 'guy', 'gym', 'hat',
  'hay', 'hen', 'hid', 'hip', 'hit', 'hop', 'hot', 'hub', 'hug', 'hum', 'hut', 'ill', 'ink',
  'inn', 'jam', 'jar', 'jaw', 'jet', 'job', 'joy', 'jug', 'key', 'kid', 'kin', 'kit', 'lab',
  'lad', 'lag', 'lap', 'law', 'lay', 'leg', 'lid', 'lie', 'lip', 'lit', 'log', 'lot', 'low',
  'mad', 'map', 'mat', 'max', 'mid', 'mix', 'mob', 'mud', 'mug', 'nap', 'net', 'nod', 'nor',
  'nut', 'oak', 'oar', 'oat', 'odd', 'off', 'oil', 'opt', 'orb', 'ore', 'owe', 'owl', 'own',
  'pad', 'pal', 'pan', 'pat', 'paw', 'pay', 'pea', 'peg', 'pen', 'pet', 'pie', 'pig', 'pin',
  'pit', 'pod', 'pop', 'pot', 'pro', 'pry', 'pub', 'pun', 'pup', 'rag', 'ram', 'ran', 'rap',
  'rat', 'raw', 'ray', 'red', 'rib', 'rid', 'rig', 'rim', 'rip', 'rob', 'rod', 'rot', 'row',
  'rub', 'rug', 'rum', 'rut', 'rye', 'sad', 'sag', 'sap', 'sat', 'saw', 'shy', 'sin', 'sip',
  'sir', 'sit', 'six', 'ski', 'sky', 'sly', 'sob', 'sod', 'son', 'sop', 'sow', 'soy', 'spa',
  'spy', 'sub', 'sue', 'sum', 'tab', 'tag', 'tan', 'tap', 'tar', 'tax', 'tea', 'ten', 'tie',
  'tin', 'tip', 'toe', 'ton', 'top', 'tot', 'tow', 'toy', 'try', 'tub', 'tug', 'urn', 'van',
  'vat', 'vet', 'vex', 'via', 'vie', 'vim', 'vow', 'wad', 'wag', 'war', 'wax', 'web', 'wed',
  'wet', 'wig', 'win', 'wit', 'woe', 'won', 'woo', 'wow', 'yak', 'yam', 'yap', 'yaw', 'yea',
  'yen', 'yet', 'yew', 'yip', 'zap', 'zen', 'zig', 'zip', 'zoo',
];

const COMMON = [
  'that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been',
  'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long',
  'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'only', 'year', 'work',
  'life', 'right', 'think', 'place', 'where', 'after', 'back', 'call', 'came', 'each',
  'first', 'found', 'give', 'great', 'hand', 'high', 'keep', 'last', 'left', 'line', 'look',
  'made', 'most', 'move', 'must', 'name', 'need', 'next', 'open', 'part', 'play', 'read',
  'same', 'seem', 'show', 'small', 'sound', 'still', 'tell', 'turn', 'under', 'water',
  'world', 'write', 'young', 'about', 'again', 'being', 'below', 'between', 'black', 'bring',
  'build', 'carry', 'cause', 'check', 'child', 'city', 'class', 'clean', 'clear', 'close',
  'color', 'could', 'count', 'cover', 'cross', 'dance', 'dark', 'death', 'depth', 'doing',
  'door', 'draw', 'dream', 'drive', 'early', 'earth', 'east', 'easy', 'eight', 'empty',
  'enjoy', 'enter', 'equal', 'even', 'every', 'exact', 'face', 'fact', 'fail', 'fall',
  'farm', 'fast', 'fear', 'feel', 'feet', 'field', 'fight', 'fill', 'film', 'find', 'fine',
  'fire', 'fish', 'five', 'floor', 'flow', 'food', 'foot', 'force', 'form', 'four', 'free',
  'fresh', 'front', 'fruit', 'full', 'game', 'garden', 'gave', 'girl', 'glass', 'gone',
  'grade', 'grass', 'gray', 'green', 'ground', 'group', 'grow', 'guess', 'guide', 'half',
  'hall', 'happy', 'hard', 'head', 'hear', 'heart', 'heat', 'heavy', 'help', 'held', 'hill',
  'hold', 'hole', 'home', 'hope', 'horse', 'hour', 'house', 'human', 'hundred', 'idea',
  'inch', 'inside', 'into', 'iron', 'join', 'jump', 'keep', 'kind', 'king', 'knew', 'land',
  'large', 'late', 'laugh', 'lead', 'learn', 'least', 'leave', 'led', 'less', 'letter',
  'level', 'light', 'list', 'listen', 'live', 'local', 'look', 'lost', 'loud', 'love',
  'machine', 'main', 'major', 'market', 'matter', 'mean', 'measure', 'meet', 'member',
  'middle', 'might', 'mile', 'milk', 'mind', 'minute', 'miss', 'model', 'modern', 'moment',
  'money', 'month', 'moon', 'more', 'morning', 'mother', 'mountain', 'mouth', 'music',
  'nation', 'nature', 'near', 'necessary', 'never', 'night', 'north', 'note', 'nothing',
  'notice', 'noun', 'number', 'object', 'observe', 'ocean', 'offer', 'office', 'often',
  'once', 'order', 'other', 'outside', 'page', 'paint', 'pair', 'paper', 'paragraph',
  'parent', 'park', 'party', 'pass', 'past', 'path', 'pattern', 'peace', 'people', 'perhaps',
  'person', 'phrase', 'pick', 'picture', 'piece', 'pitch', 'plain', 'plan', 'plane',
  'planet', 'plant', 'please', 'plenty', 'point', 'poor', 'position', 'possible', 'pound',
  'power', 'practice', 'prepare', 'present', 'press', 'pretty', 'print', 'problem',
  'produce', 'product', 'program', 'property', 'protect', 'prove', 'provide', 'public',
  'pull', 'pupil', 'pure', 'push', 'quarter', 'question', 'quick', 'quiet', 'quite', 'race',
  'radio', 'rain', 'raise', 'range', 'rather', 'reach', 'ready', 'real', 'reason', 'receive',
  'record', 'region', 'remember', 'repeat', 'reply', 'report', 'represent', 'require',
  'rest', 'result', 'return', 'rich', 'ride', 'ring', 'rise', 'river', 'road', 'rock',
  'roll', 'room', 'root', 'rope', 'rose', 'round', 'rule', 'safe', 'said', 'sail', 'salt',
  'sand', 'save', 'scale', 'school', 'science', 'score', 'season', 'seat', 'second',
  'section', 'seed', 'select', 'self', 'sell', 'send', 'sense', 'sent', 'separate', 'serve',
  'settle', 'seven', 'several', 'shade', 'shape', 'share', 'sharp', 'sheet', 'shelf',
  'shine', 'ship', 'shirt', 'shoe', 'shop', 'shore', 'short', 'should', 'shoulder', 'shout',
  'side', 'sight', 'sign', 'silent', 'silver', 'similar', 'simple', 'since', 'sing',
  'single', 'sister', 'size', 'skill', 'skin', 'sleep', 'slip', 'slow', 'smell', 'smile',
  'snow', 'soft', 'soil', 'sold', 'soldier', 'solution', 'solve', 'song', 'soon', 'sort',
  'south', 'space', 'speak', 'special', 'speech', 'speed', 'spell', 'spend', 'spirit',
  'split', 'spoke', 'sport', 'spot', 'spread', 'spring', 'square', 'stage', 'stand', 'star',
  'start', 'state', 'station', 'stay', 'steam', 'steel', 'step', 'stick', 'stock', 'stone',
  'stood', 'stop', 'store', 'story', 'straight', 'strange', 'stream', 'street', 'stretch',
  'strike', 'string', 'strong', 'structure', 'student', 'study', 'subject', 'substance',
  'success', 'sudden', 'suffix', 'sugar', 'suggest', 'suit', 'summer', 'supply', 'support',
  'sure', 'surface', 'surprise', 'swim', 'syllable', 'symbol', 'system', 'table', 'tail',
  'talk', 'tall', 'teach', 'team', 'teeth', 'temperature', 'term', 'test', 'thank', 'their',
  'then', 'there', 'these', 'thick', 'thin', 'thing', 'third', 'those', 'though', 'thought',
  'thousand', 'three', 'through', 'throw', 'thus', 'together', 'told', 'tone', 'took',
  'tool', 'total', 'touch', 'toward', 'town', 'track', 'trade', 'train', 'travel', 'tree',
  'triangle', 'trip', 'trouble', 'truck', 'true', 'tube', 'twelve', 'twenty', 'twice', 'type',
  'understand', 'unit', 'until', 'upon', 'usual', 'valley', 'value', 'vary', 'verb', 'view',
  'village', 'visit', 'voice', 'vowel', 'wait', 'walk', 'wall', 'warm', 'wash', 'watch',
  'wave', 'weak', 'wear', 'weather', 'week', 'weight', 'west', 'wheel', 'whether', 'which',
  'while', 'white', 'whole', 'whose', 'wide', 'wife', 'wild', 'wind', 'window', 'wing',
  'winter', 'wire', 'wish', 'within', 'without', 'woman', 'women', 'wonder', 'wood', 'word',
  'would', 'written', 'wrong', 'yard', 'yellow', 'zero', 'zone',
];

const ACADEMIC = [
  'analyze', 'approach', 'argument', 'assume', 'authority', 'available', 'benefit', 'concept',
  'conclude', 'conduct', 'consider', 'consistent', 'context', 'contribute', 'culture', 'data',
  'define', 'demonstrate', 'derive', 'describe', 'design', 'determine', 'develop', 'distribute',
  'document', 'economy', 'environment', 'establish', 'estimate', 'evaluate', 'evidence',
  'explain', 'factor', 'formula', 'function', 'generate', 'hypothesis', 'identify', 'illustrate',
  'impact', 'implement', 'imply', 'indicate', 'individual', 'interpret', 'investigate', 'involve',
  'justify', 'knowledge', 'language', 'legal', 'legislation', 'logic', 'maintain', 'method',
  'modify', 'negative', 'notion', 'obtain', 'occur', 'option', 'organize', 'outcome', 'parameter',
  'participate', 'perceive', 'period', 'policy', 'positive', 'potential', 'predict', 'previous',
  'primary', 'principle', 'procedure', 'process', 'professional', 'project', 'promote', 'publish',
  'purpose', 'qualify', 'quality', 'quantity', 'random', 'ratio', 'react', 'reflect', 'relevant',
  'reliable', 'research', 'resource', 'respond', 'reveal', 'review', 'revise', 'role', 'scenario',
  'schedule', 'sequence', 'significant', 'source', 'specific', 'strategy', 'structure', 'summary',
  'survey', 'technique', 'technology', 'theory', 'therefore', 'topic', 'tradition', 'transfer',
  'trend', 'typical', 'underlie', 'undertake', 'uniform', 'unique', 'valid', 'variable', 'version',
  'volume', 'welfare', 'whereas', 'widespread', 'wisdom',
];

const TYPING = [
  'keyboard', 'finger', 'rhythm', 'flow', 'practice', 'accuracy', 'paragraph', 'sentence',
  'focus', 'calm', 'typing', 'letter', 'layout', 'shift', 'space', 'enter', 'delete',
  'cursor', 'buffer', 'prompt', 'metric', 'result', 'graph', 'chart', 'steady', 'fluent',
];

/** Deduplicated master pool — 700+ words. */
export const TYPING_WORDS = [...new Set([...SHORT, ...CORE, ...COMMON, ...ACADEMIC, ...TYPING])].filter(
  (w) => w.length >= 1,
);

const PUNCTUATION = ['.', ',', '!', '?', ';', ':'];
const NUMBER_TOKENS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '10', '12', '15', '25', '42', '50', '64', '75', '100', '128', '256', '365', '500', '1000',
  '2024', '2025', '2026',
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function decorateWord(word, { punctuation, numbers }) {
  if (numbers && Math.random() < 0.1) {
    return pickRandom(NUMBER_TOKENS);
  }
  if (punctuation && Math.random() < 0.14) {
    return word + pickRandom(PUNCTUATION);
  }
  return word;
}

function nextFromBag(bag, bagIndex, lastWord) {
  let attempts = 0;
  let idx = bagIndex;
  while (attempts < bag.length) {
    const word = bag[idx % bag.length];
    idx += 1;
    if (word !== lastWord) {
      return { word, bagIndex: idx };
    }
    attempts += 1;
  }
  return { word: bag[idx % bag.length], bagIndex: idx + 1 };
}

/**
 * Build a varied word list: shuffled bag cycling, no immediate repeats,
 * occasional short-word inserts for rhythm.
 */
export function pickTypingWords(count, options = {}) {
  const out = [];
  let bag = shuffle(TYPING_WORDS);
  let bagIndex = 0;
  let lastWord = '';

  const refillBag = () => {
    bag = shuffle(TYPING_WORDS);
    bagIndex = 0;
  };

  const shortPool = SHORT.filter((w) => w.length >= 2);

  for (let i = 0; i < count; i += 1) {
    if (bagIndex >= bag.length) refillBag();

    let word;
    if (i > 0 && i % 19 === 0 && !options.numbers && shortPool.length) {
      word = pickRandom(shortPool.filter((w) => w !== lastWord));
    } else {
      const picked = nextFromBag(bag, bagIndex, lastWord);
      word = picked.word;
      bagIndex = picked.bagIndex;
    }

    out.push(decorateWord(word, options));
    lastWord = word;
  }

  return out;
}
