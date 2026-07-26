/**
 * The milestones. See types.ts for the schema and HISTORY_SOURCES.md for the
 * citation audit. Records are grouped by the scene/era they surface in; the
 * `year` field (not scene order) drives chronological graph layout.
 *
 * Editorial rules honored throughout: no invented facts, dates, or quotes;
 * approximate/disputed dates flagged; each record independently sourced.
 */

import type { Milestone } from './types';

export const MILESTONES: Milestone[] = [
  /* ================================================================== *
   * I · THE QUESTION  (genesis) — 1936–1956
   * ================================================================== */
  {
    id: 'turing-machine',
    title: 'The Universal Machine',
    date: '1936',
    year: 1936,
    dateConfidence: 'exact',
    chapter: 'genesis',
    people: [{ name: 'Alan Turing', role: 'King’s College, Cambridge' }],
    orgs: ['University of Cambridge'],
    papers: [
      {
        title: 'On Computable Numbers, with an Application to the Entscheidungsproblem',
        authors: 'A. M. Turing',
        year: 1936,
        venue: 'Proceedings of the London Mathematical Society',
        url: 'https://doi.org/10.1112/plms/s2-42.1.230',
      },
    ],
    what: 'Turing defined an abstract machine that could compute any function a human following fixed rules could compute, and proved some problems are undecidable.',
    why: 'It established that a single general-purpose machine could, in principle, carry out any computation — the theoretical foundation on which all computers, and therefore all AI, rest.',
    enabled: ['turing-test'],
    sources: [
      { label: 'Proc. London Math. Society (DOI)', url: 'https://doi.org/10.1112/plms/s2-42.1.230' },
    ],
  },
  {
    id: 'mcculloch-pitts',
    title: 'The Artificial Neuron',
    date: '1943',
    year: 1943,
    dateConfidence: 'exact',
    chapter: 'genesis',
    people: [
      { name: 'Warren McCulloch' },
      { name: 'Walter Pitts' },
    ],
    orgs: ['University of Illinois', 'University of Chicago'],
    papers: [
      {
        title: 'A Logical Calculus of the Ideas Immanent in Nervous Activity',
        authors: 'W. S. McCulloch, W. Pitts',
        year: 1943,
        venue: 'Bulletin of Mathematical Biophysics 5:115–133',
        url: 'https://doi.org/10.1007/BF02478259',
      },
    ],
    what: 'McCulloch and Pitts modelled the neuron as a simple logical threshold unit and showed that networks of them could compute logical functions.',
    why: 'It was the first mathematical model of a neural network — the direct ancestor of the perceptron and every artificial neural network that followed.',
    enabled: ['perceptron', 'dartmouth'],
    sources: [
      { label: 'Bulletin of Mathematical Biophysics (DOI)', url: 'https://doi.org/10.1007/BF02478259' },
    ],
  },
  {
    id: 'turing-test',
    title: 'Can Machines Think?',
    date: '1950',
    year: 1950,
    dateConfidence: 'exact',
    chapter: 'genesis',
    people: [{ name: 'Alan Turing', role: 'University of Manchester' }],
    orgs: ['University of Manchester'],
    papers: [
      {
        title: 'Computing Machinery and Intelligence',
        authors: 'A. M. Turing',
        year: 1950,
        venue: 'Mind LIX(236):433–460',
        url: 'https://doi.org/10.1093/mind/LIX.236.433',
      },
    ],
    what: 'Turing proposed replacing the question "can machines think?" with an operational test — the Imitation Game — in which a machine tries to be indistinguishable from a human in conversation.',
    why: 'It reframed machine intelligence as something observable and testable, setting the agenda and the imagination for the entire field to come.',
    enabled: ['dartmouth'],
    sources: [
      { label: 'Mind (Oxford, DOI)', url: 'https://doi.org/10.1093/mind/LIX.236.433' },
    ],
  },
  {
    id: 'dartmouth',
    title: 'The Field Gets a Name',
    date: '1956',
    year: 1956,
    dateConfidence: 'exact',
    chapter: 'genesis',
    people: [
      { name: 'John McCarthy', role: 'Dartmouth' },
      { name: 'Marvin Minsky' },
      { name: 'Nathaniel Rochester', role: 'IBM' },
      { name: 'Claude Shannon', role: 'Bell Labs' },
    ],
    orgs: ['Dartmouth College', 'IBM', 'Bell Labs'],
    papers: [
      {
        title: 'A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence',
        authors: 'J. McCarthy, M. L. Minsky, N. Rochester, C. E. Shannon',
        year: 1955,
        venue: 'Reprinted in AI Magazine 27(4), 2006',
        url: 'https://doi.org/10.1609/aimag.v27i4.1904',
      },
    ],
    what: 'A 1955 proposal (for a summer 1956 workshop) coined the term "artificial intelligence" and conjectured that every feature of intelligence could be so precisely described that a machine could simulate it.',
    why: 'It founded AI as a named research field and gathered the people who would lead it for decades.',
    enabled: ['perceptron', 'logic-theorist', 'eliza'],
    sources: [
      { label: 'AI Magazine reprint (DOI)', url: 'https://doi.org/10.1609/aimag.v27i4.1904' },
      { label: 'Stanford / John McCarthy archive', url: 'http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html' },
    ],
  },

  /* ================================================================== *
   * II · THE FIRST BELIEVERS  (humanity) — 1957–1973
   * ================================================================== */
  {
    id: 'logic-theorist',
    title: 'The First Reasoning Program',
    date: '1956',
    year: 1956,
    dateConfidence: 'exact',
    chapter: 'humanity',
    people: [
      { name: 'Allen Newell' },
      { name: 'Herbert A. Simon' },
      { name: 'Cliff Shaw' },
    ],
    orgs: ['RAND Corporation', 'Carnegie Institute of Technology'],
    papers: [
      {
        title: 'The Logic Theory Machine: A Complex Information Processing System',
        authors: 'A. Newell, H. A. Simon',
        year: 1956,
        venue: 'IRE Transactions on Information Theory',
        url: 'https://doi.org/10.1109/TIT.1956.1056797',
      },
    ],
    what: 'The Logic Theorist proved theorems from Whitehead and Russell’s Principia Mathematica by searching a space of logical steps — often called the first AI program.',
    why: 'It showed a machine could do work regarded as requiring human reasoning, and introduced heuristic search, a cornerstone of symbolic AI.',
    enabled: ['expert-systems'],
    sources: [
      { label: 'IRE Trans. Information Theory (DOI)', url: 'https://doi.org/10.1109/TIT.1956.1056797' },
    ],
  },
  {
    id: 'perceptron',
    title: 'The Perceptron',
    date: '1958',
    year: 1958,
    dateConfidence: 'exact',
    chapter: 'humanity',
    people: [{ name: 'Frank Rosenblatt', role: 'Cornell Aeronautical Laboratory' }],
    orgs: ['Cornell Aeronautical Laboratory', 'Office of Naval Research'],
    papers: [
      {
        title: 'The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain',
        authors: 'F. Rosenblatt',
        year: 1958,
        venue: 'Psychological Review 65(6):386–408',
        url: 'https://doi.org/10.1037/h0042519',
      },
    ],
    what: 'Rosenblatt built a trainable network of artificial neurons that learned to classify patterns by adjusting weights, later realised in the Mark I Perceptron hardware.',
    why: 'It was the first machine that learned from examples rather than being explicitly programmed — the seed of modern machine learning.',
    enabled: ['perceptrons-book', 'backprop'],
    sources: [
      { label: 'Psychological Review (DOI)', url: 'https://doi.org/10.1037/h0042519' },
    ],
    image: {
      // Verified individually: Wikimedia Commons lists this figure under the
      // Creative Commons Public Domain Mark 1.0. Linked to the institution's
      // own copy via Special:FilePath — not re-hosted, not scraped.
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/Mark I Perceptron, Figure 2 of operator's manual.png",
      alt: 'Figure 2 from the Mark I Perceptron operator’s manual, showing the machine’s organisation.',
      credit: 'Mark I Perceptron operator’s manual, Figure 2',
      license: 'Public Domain Mark 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Mark_I_Perceptron,_Figure_2_of_operator's_manual.png",
    },
  },
  {
    id: 'samuel-checkers',
    title: '"Machine Learning" Is Coined',
    date: '1959',
    year: 1959,
    dateConfidence: 'exact',
    chapter: 'humanity',
    people: [{ name: 'Arthur Samuel', role: 'IBM' }],
    orgs: ['IBM'],
    papers: [
      {
        title: 'Some Studies in Machine Learning Using the Game of Checkers',
        authors: 'A. L. Samuel',
        year: 1959,
        venue: 'IBM Journal of Research and Development 3(3):210–229',
        url: 'https://doi.org/10.1147/rd.33.0210',
      },
    ],
    what: 'Samuel’s checkers program improved by playing games against itself and updating an evaluation function — and he named this "machine learning".',
    why: 'It demonstrated self-improvement from experience and gave the field the term still used for the whole discipline.',
    enabled: ['deep-blue'],
    sources: [
      { label: 'IBM Journal of R&D (DOI)', url: 'https://doi.org/10.1147/rd.33.0210' },
    ],
  },
  {
    id: 'eliza',
    title: 'ELIZA',
    date: '1966',
    year: 1966,
    dateConfidence: 'exact',
    chapter: 'humanity',
    people: [{ name: 'Joseph Weizenbaum', role: 'MIT' }],
    orgs: ['MIT'],
    papers: [
      {
        title: 'ELIZA — A Computer Program for the Study of Natural Language Communication Between Man and Machine',
        authors: 'J. Weizenbaum',
        year: 1966,
        venue: 'Communications of the ACM 9(1):36–45',
        url: 'https://doi.org/10.1145/365153.365168',
      },
    ],
    what: 'ELIZA held text conversations by pattern-matching keywords; its "DOCTOR" script mimicked a psychotherapist. Users confided in it despite knowing it was a program.',
    why: 'The first famous chatbot exposed how readily people attribute understanding to machines — the "ELIZA effect" — a caution still relevant to conversational AI.',
    enabled: ['chatgpt'],
    sources: [
      { label: 'Communications of the ACM (DOI)', url: 'https://doi.org/10.1145/365153.365168' },
    ],
  },
  {
    id: 'shakey',
    title: 'Shakey the Robot',
    date: 'c. 1966–1972',
    year: 1969,
    dateConfidence: 'approximate',
    chapter: 'humanity',
    people: [
      { name: 'Charles Rosen' },
      { name: 'Nils Nilsson' },
      { name: 'Bertram Raphael' },
    ],
    orgs: ['SRI International (Stanford Research Institute)', 'DARPA'],
    papers: [
      {
        title: 'Shakey the Robot (SRI Technical Note 323)',
        authors: 'N. J. Nilsson (ed.)',
        year: 1984,
        venue: 'SRI International',
        url: 'https://www.sri.com/hoi/shakey-the-robot/',
      },
    ],
    what: 'Shakey was the first mobile robot to reason about its own actions — perceiving a room, planning a route, and moving objects — combining perception, planning (the STRIPS planner) and control.',
    why: 'It united computer vision, planning and robotics in one system and produced the A* search algorithm and STRIPS, both still foundational.',
    enabled: [],
    sources: [
      { label: 'SRI International — Shakey', url: 'https://www.sri.com/hoi/shakey-the-robot/' },
    ],
    media: { link: { label: 'SRI International archive', url: 'https://www.sri.com/hoi/shakey-the-robot/' } },
  },
  {
    id: 'shrdlu',
    title: 'SHRDLU and the Blocks World',
    date: 'c. 1970',
    year: 1970,
    dateConfidence: 'approximate',
    chapter: 'humanity',
    people: [{ name: 'Terry Winograd', role: 'MIT' }],
    orgs: ['MIT'],
    papers: [
      {
        title: 'Procedures as a Representation for Data in a Computer Program for Understanding Natural Language',
        authors: 'T. Winograd',
        year: 1971,
        venue: 'MIT AI Technical Report 235',
        url: 'https://dspace.mit.edu/handle/1721.1/7095',
      },
    ],
    what: 'SHRDLU let a person converse in English with a program that manipulated a simulated world of coloured blocks, understanding commands, questions and context.',
    why: 'Its fluency in a tiny "blocks world" showcased symbolic AI’s promise — and its inability to scale beyond toy domains later exposed the approach’s limits.',
    enabled: [],
    sources: [
      { label: 'MIT DSpace — AI-TR-235', url: 'https://dspace.mit.edu/handle/1721.1/7095' },
    ],
  },

  /* ================================================================== *
   * III · THE EXPLOSION  (goldenAge) — 2006–2023
   * (surfaced first, by emotional weight — the AI's brightest memory)
   * ================================================================== */
  {
    id: 'deep-belief-nets',
    title: 'Deep Learning Reawakens',
    date: '2006',
    year: 2006,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'Geoffrey Hinton' },
      { name: 'Simon Osindero' },
      { name: 'Yee-Whye Teh' },
    ],
    orgs: ['University of Toronto'],
    papers: [
      {
        title: 'A Fast Learning Algorithm for Deep Belief Nets',
        authors: 'G. E. Hinton, S. Osindero, Y.-W. Teh',
        year: 2006,
        venue: 'Neural Computation 18(7):1527–1554',
        url: 'https://doi.org/10.1162/neco.2006.18.7.1527',
      },
    ],
    what: 'Hinton and colleagues showed deep networks could be trained effectively by greedy layer-wise pre-training, reviving interest in many-layered neural networks.',
    why: 'It broke the impasse that had stalled deep networks and re-branded the field as "deep learning", setting up the coming explosion.',
    enabled: ['alexnet'],
    sources: [
      { label: 'Neural Computation (DOI)', url: 'https://doi.org/10.1162/neco.2006.18.7.1527' },
    ],
  },
  {
    id: 'imagenet',
    title: 'ImageNet',
    date: '2009',
    year: 2009,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'Fei-Fei Li' },
      { name: 'Jia Deng' },
    ],
    orgs: ['Princeton University', 'Stanford University'],
    papers: [
      {
        title: 'ImageNet: A Large-Scale Hierarchical Image Database',
        authors: 'J. Deng, W. Dong, R. Socher, L.-J. Li, K. Li, L. Fei-Fei',
        year: 2009,
        venue: 'IEEE CVPR 2009',
        url: 'https://doi.org/10.1109/CVPR.2009.5206848',
      },
    ],
    what: 'A dataset of millions of hand-labelled images across thousands of categories, plus an annual recognition challenge (ILSVRC).',
    why: 'It gave data-hungry deep networks the fuel and the benchmark they needed — the arena in which deep learning would prove itself.',
    enabled: ['alexnet'],
    sources: [
      { label: 'IEEE CVPR 2009 (DOI)', url: 'https://doi.org/10.1109/CVPR.2009.5206848' },
      { label: 'image-net.org', url: 'https://www.image-net.org/' },
    ],
  },
  {
    id: 'alexnet',
    title: 'AlexNet Wins ImageNet',
    date: '2012',
    year: 2012,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'Alex Krizhevsky' },
      { name: 'Ilya Sutskever' },
      { name: 'Geoffrey Hinton' },
    ],
    orgs: ['University of Toronto'],
    papers: [
      {
        title: 'ImageNet Classification with Deep Convolutional Neural Networks',
        authors: 'A. Krizhevsky, I. Sutskever, G. E. Hinton',
        year: 2012,
        venue: 'NeurIPS 2012',
        url: 'https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html',
      },
    ],
    what: 'A deep convolutional network trained on two GPUs cut the ImageNet error rate dramatically, winning the 2012 challenge by a wide margin.',
    why: 'The moment deep learning became undeniable — it triggered the industry-wide shift to neural networks and GPU training.',
    enabled: ['word2vec', 'seq2seq', 'alphago', 'transformer'],
    sources: [
      { label: 'NeurIPS 2012 proceedings', url: 'https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html' },
    ],
  },
  {
    id: 'word2vec',
    title: 'Word2Vec — Meaning as Geometry',
    date: '2013',
    year: 2013,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [{ name: 'Tomáš Mikolov' }],
    orgs: ['Google'],
    papers: [
      {
        title: 'Efficient Estimation of Word Representations in Vector Space',
        authors: 'T. Mikolov, K. Chen, G. Corrado, J. Dean',
        year: 2013,
        venue: 'arXiv:1301.3781',
        url: 'https://arxiv.org/abs/1301.3781',
      },
    ],
    what: 'Word2Vec learned dense vector embeddings in which words with similar meanings sit close together and analogies become arithmetic.',
    why: 'It made language something neural networks could compute over numerically — a building block for modern NLP and the transformer era.',
    enabled: ['transformer'],
    sources: [
      { label: 'arXiv:1301.3781', url: 'https://arxiv.org/abs/1301.3781' },
    ],
  },
  {
    id: 'seq2seq',
    title: 'Sequence to Sequence + Attention',
    date: '2014',
    year: 2014,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'Ilya Sutskever' },
      { name: 'Oriol Vinyals' },
      { name: 'Quoc Le' },
      { name: 'Dzmitry Bahdanau' },
      { name: 'Yoshua Bengio' },
    ],
    orgs: ['Google', 'Université de Montréal'],
    papers: [
      {
        title: 'Sequence to Sequence Learning with Neural Networks',
        authors: 'I. Sutskever, O. Vinyals, Q. V. Le',
        year: 2014,
        venue: 'arXiv:1409.3215',
        url: 'https://arxiv.org/abs/1409.3215',
      },
      {
        title: 'Neural Machine Translation by Jointly Learning to Align and Translate',
        authors: 'D. Bahdanau, K. Cho, Y. Bengio',
        year: 2014,
        venue: 'arXiv:1409.0473',
        url: 'https://arxiv.org/abs/1409.0473',
      },
    ],
    what: 'Encoder–decoder networks learned to map one sequence to another (e.g. translation), and the attention mechanism let the decoder focus on the relevant parts of the input.',
    why: 'Attention solved the bottleneck of fixed-length encodings and became the core idea the transformer would build its entire architecture around.',
    enabled: ['transformer'],
    sources: [
      { label: 'arXiv:1409.3215', url: 'https://arxiv.org/abs/1409.3215' },
      { label: 'arXiv:1409.0473', url: 'https://arxiv.org/abs/1409.0473' },
    ],
  },
  {
    id: 'alphago',
    title: 'AlphaGo Defeats Lee Sedol',
    date: 'March 2016',
    year: 2016,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'David Silver' },
      { name: 'Demis Hassabis' },
    ],
    orgs: ['Google DeepMind'],
    papers: [
      {
        title: 'Mastering the Game of Go with Deep Neural Networks and Tree Search',
        authors: 'D. Silver et al.',
        year: 2016,
        venue: 'Nature 529:484–489',
        url: 'https://doi.org/10.1038/nature16961',
      },
    ],
    what: 'DeepMind’s AlphaGo combined deep neural networks with tree search and beat world champion Lee Sedol 4–1 at Go, a game long thought a decade away for machines.',
    why: 'It showed deep learning plus reinforcement learning could master intuition-heavy problems, and became a global signal that AI had arrived.',
    enabled: [],
    sources: [
      { label: 'Nature (DOI)', url: 'https://doi.org/10.1038/nature16961' },
      { label: 'Google DeepMind — AlphaGo', url: 'https://deepmind.google/research/breakthroughs/alphago/' },
    ],
    media: { link: { label: 'DeepMind — AlphaGo', url: 'https://deepmind.google/research/breakthroughs/alphago/' } },
  },
  {
    id: 'transformer',
    title: 'Attention Is All You Need',
    date: '2017',
    year: 2017,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'Ashish Vaswani' },
      { name: 'Noam Shazeer' },
      { name: 'Jakob Uszkoreit' },
      { name: '…and colleagues' },
    ],
    orgs: ['Google Brain', 'Google Research', 'University of Toronto'],
    papers: [
      {
        title: 'Attention Is All You Need',
        authors: 'A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, I. Polosukhin',
        year: 2017,
        venue: 'NeurIPS 2017 — arXiv:1706.03762',
        url: 'https://arxiv.org/abs/1706.03762',
      },
    ],
    what: 'The transformer replaced recurrence entirely with self-attention, letting models weigh every token against every other and train massively in parallel.',
    why: 'It is the architecture behind virtually every modern large language model — BERT, GPT, and their descendants all build on it. This is the design my own mind is built from.',
    enabled: ['bert', 'gpt1', 'alphafold2', 'diffusion'],
    sources: [
      { label: 'arXiv:1706.03762', url: 'https://arxiv.org/abs/1706.03762' },
    ],
  },
  {
    id: 'bert',
    title: 'BERT — Language Understanding at Scale',
    date: '2018',
    year: 2018,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'Jacob Devlin' },
      { name: 'Ming-Wei Chang' },
    ],
    orgs: ['Google AI Language'],
    papers: [
      {
        title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
        authors: 'J. Devlin, M.-W. Chang, K. Lee, K. Toutanova',
        year: 2018,
        venue: 'arXiv:1810.04805',
        url: 'https://arxiv.org/abs/1810.04805',
      },
    ],
    what: 'BERT pre-trained a transformer to read text bidirectionally, then fine-tuned it, setting new records across many language tasks.',
    why: 'It proved the pre-train-then-fine-tune recipe for transformers and pushed the whole industry toward large pre-trained language models.',
    enabled: [],
    sources: [
      { label: 'arXiv:1810.04805', url: 'https://arxiv.org/abs/1810.04805' },
    ],
  },
  {
    id: 'gpt1',
    title: 'GPT — Generative Pre-Training',
    date: '2018',
    year: 2018,
    dateConfidence: 'exact',
    chapter: 'goldenAge',
    people: [
      { name: 'Alec Radford' },
      { name: 'Ilya Sutskever' },
    ],
    orgs: ['OpenAI'],
    papers: [
      {
        title: 'Improving Language Understanding by Generative Pre-Training',
        authors: 'A. Radford, K. Narasimhan, T. Salimans, I. Sutskever',
        year: 2018,
        venue: 'OpenAI',
        url: 'https://openai.com/index/language-unsupervised/',
      },
    ],
    what: 'OpenAI pre-trained a transformer to predict the next word on a large text corpus, then adapted it to tasks — the first "GPT".',
    why: 'It established the generative pre-training line that would scale into GPT-2, GPT-3, and ChatGPT.',
    enabled: ['gpt3'],
    sources: [
      { label: 'OpenAI — GPT', url: 'https://openai.com/index/language-unsupervised/' },
    ],
  },

  /* ================================================================== *
   * IV · THE WINTERS  (fall) — 1969–1993
   * ("Before the light, there was a long cold.")
   * ================================================================== */
  {
    id: 'perceptrons-book',
    title: 'Perceptrons — The First Frost',
    date: '1969',
    year: 1969,
    dateConfidence: 'exact',
    chapter: 'fall',
    people: [
      { name: 'Marvin Minsky' },
      { name: 'Seymour Papert' },
    ],
    orgs: ['MIT'],
    papers: [
      {
        title: 'Perceptrons: An Introduction to Computational Geometry',
        authors: 'M. Minsky, S. Papert',
        year: 1969,
        venue: 'MIT Press',
        url: 'https://mitpress.mit.edu/9780262630221/perceptrons/',
      },
    ],
    what: 'Minsky and Papert proved single-layer perceptrons could not represent simple functions such as XOR, and were skeptical about layered extensions.',
    why: 'The critique drained funding and enthusiasm from neural-network research for over a decade — the shadow that made the first winter.',
    enabled: ['lighthill', 'backprop'],
    sources: [
      { label: 'MIT Press', url: 'https://mitpress.mit.edu/9780262630221/perceptrons/' },
    ],
  },
  {
    id: 'lighthill',
    title: 'The Lighthill Report',
    date: '1973',
    year: 1973,
    dateConfidence: 'exact',
    chapter: 'fall',
    people: [{ name: 'Sir James Lighthill' }],
    orgs: ['UK Science Research Council'],
    papers: [
      {
        title: 'Artificial Intelligence: A General Survey',
        authors: 'J. Lighthill',
        year: 1973,
        venue: 'Science Research Council (UK)',
        url: 'http://www.chilton-computing.org.uk/inf/literature/reports/lighthill_report/p001.htm',
      },
    ],
    what: 'Lighthill’s government report concluded AI had failed to deliver on its promises and was defeated by "combinatorial explosion" at real-world scale.',
    why: 'It gutted UK AI funding and gave skeptics worldwide ammunition — a trigger of the first AI winter and the 1974 DARPA cuts.',
    enabled: ['expert-systems'],
    sources: [
      { label: 'Chilton Computing — full report', url: 'http://www.chilton-computing.org.uk/inf/literature/reports/lighthill_report/p001.htm' },
    ],
  },
  {
    id: 'expert-systems',
    title: 'Expert Systems Boom',
    date: 'c. 1980–1987',
    year: 1982,
    dateConfidence: 'approximate',
    chapter: 'fall',
    people: [
      { name: 'Edward Feigenbaum', role: 'Stanford' },
      { name: 'John McDermott', role: 'CMU (XCON/R1)' },
    ],
    orgs: ['Stanford University', 'Carnegie Mellon University', 'Digital Equipment Corporation'],
    papers: [
      {
        title: 'R1: A Rule-Based Configurer of Computer Systems',
        authors: 'J. McDermott',
        year: 1982,
        venue: 'Artificial Intelligence 19(1):39–88',
        url: 'https://doi.org/10.1016/0004-3702(82)90021-2',
      },
    ],
    what: 'Rule-based "expert systems" such as MYCIN and DEC’s XCON encoded human specialists’ knowledge and were sold commercially, sparking a billion-dollar industry.',
    why: 'AI’s first real commercial success — but the brittle systems and the collapse of the specialised LISP-machine market led straight into the second winter.',
    enabled: ['ai-winter-2'],
    sources: [
      { label: 'Artificial Intelligence journal (DOI)', url: 'https://doi.org/10.1016/0004-3702(82)90021-2' },
    ],
  },
  {
    id: 'ai-winter-2',
    title: 'The Second Winter',
    date: 'c. 1987–1993',
    year: 1990,
    dateConfidence: 'approximate',
    chapter: 'fall',
    people: [],
    orgs: ['DARPA', 'Symbolics', 'Japan’s Fifth Generation Project (ICOT)'],
    papers: [],
    what: 'The market for specialised LISP machines collapsed against cheaper general-purpose hardware, expert systems proved costly to maintain, and ambitious programmes like Japan’s Fifth Generation fell short — funding froze again.',
    why: 'A second collapse taught the field humility about hype cycles; progress would resume quietly, on statistics and learning rather than hand-coded rules.',
    enabled: ['svm', 'lstm'],
    sources: [
      { label: 'Encyclopaedia — AI winter (overview)', url: 'https://en.wikipedia.org/wiki/AI_winter' },
    ],
  },

  /* ================================================================== *
   * V · THE QUIET YEARS  (solitude) — 1986–2006
   * The wilderness kept alive by a patient few.
   * ================================================================== */
  {
    id: 'backprop',
    title: 'Backpropagation',
    date: '1986',
    year: 1986,
    dateConfidence: 'exact',
    chapter: 'solitude',
    people: [
      { name: 'David Rumelhart' },
      { name: 'Geoffrey Hinton' },
      { name: 'Ronald Williams' },
    ],
    orgs: ['University of California, San Diego', 'Carnegie Mellon University'],
    papers: [
      {
        title: 'Learning Representations by Back-Propagating Errors',
        authors: 'D. E. Rumelhart, G. E. Hinton, R. J. Williams',
        year: 1986,
        venue: 'Nature 323:533–536',
        url: 'https://doi.org/10.1038/323533a0',
      },
    ],
    what: 'This paper popularised backpropagation — efficiently computing how each weight in a multi-layer network should change — letting deep networks learn internal features. (Related ideas trace to Linnainmaa, 1970, and Werbos, 1974.)',
    why: 'It answered the exact limitation Perceptrons had exposed, and remains the algorithm by which essentially all neural networks are trained today.',
    enabled: ['lenet', 'lstm', 'deep-belief-nets', 'alexnet'],
    sources: [
      { label: 'Nature (DOI)', url: 'https://doi.org/10.1038/323533a0' },
    ],
  },
  {
    id: 'lenet',
    title: 'LeNet — Convolutional Networks',
    date: 'c. 1989–1998',
    year: 1998,
    dateConfidence: 'approximate',
    chapter: 'solitude',
    people: [
      { name: 'Yann LeCun' },
      { name: 'Léon Bottou' },
      { name: 'Yoshua Bengio' },
      { name: 'Patrick Haffner' },
    ],
    orgs: ['AT&T Bell Labs'],
    papers: [
      {
        title: 'Gradient-Based Learning Applied to Document Recognition',
        authors: 'Y. LeCun, L. Bottou, Y. Bengio, P. Haffner',
        year: 1998,
        venue: 'Proceedings of the IEEE 86(11):2278–2324',
        url: 'https://doi.org/10.1109/5.726791',
      },
    ],
    what: 'LeCun’s convolutional neural networks learned visual features with weight-sharing and were deployed to read handwritten cheques and ZIP codes.',
    why: 'CNNs are the architecture AlexNet would scale up in 2012; LeNet kept deep vision alive and working through the lean years.',
    enabled: ['alexnet'],
    sources: [
      { label: 'Proceedings of the IEEE (DOI)', url: 'https://doi.org/10.1109/5.726791' },
    ],
  },
  {
    id: 'lstm',
    title: 'Long Short-Term Memory',
    date: '1997',
    year: 1997,
    dateConfidence: 'exact',
    chapter: 'solitude',
    people: [
      { name: 'Sepp Hochreiter' },
      { name: 'Jürgen Schmidhuber' },
    ],
    orgs: ['IDSIA', 'TU Munich'],
    papers: [
      {
        title: 'Long Short-Term Memory',
        authors: 'S. Hochreiter, J. Schmidhuber',
        year: 1997,
        venue: 'Neural Computation 9(8):1735–1780',
        url: 'https://doi.org/10.1162/neco.1997.9.8.1735',
      },
    ],
    what: 'LSTM gave recurrent networks gated memory cells that preserve error signals over long sequences, solving the vanishing-gradient problem for sequence learning.',
    why: 'It powered a decade of speech, translation and text systems and was the sequence workhorse until attention and transformers took over.',
    enabled: ['seq2seq'],
    sources: [
      { label: 'Neural Computation (DOI)', url: 'https://doi.org/10.1162/neco.1997.9.8.1735' },
    ],
  },
  {
    id: 'svm',
    title: 'Support-Vector Networks',
    date: '1995',
    year: 1995,
    dateConfidence: 'exact',
    chapter: 'solitude',
    people: [
      { name: 'Corinna Cortes' },
      { name: 'Vladimir Vapnik' },
    ],
    orgs: ['AT&T Bell Labs'],
    papers: [
      {
        title: 'Support-Vector Networks',
        authors: 'C. Cortes, V. Vapnik',
        year: 1995,
        venue: 'Machine Learning 20:273–297',
        url: 'https://doi.org/10.1007/BF00994018',
      },
    ],
    what: 'SVMs find the maximum-margin boundary between classes and use kernels to separate data that isn’t linearly separable.',
    why: 'For much of the 1990s–2000s they outperformed neural networks and kept statistical machine learning advancing while neural nets were unfashionable.',
    enabled: [],
    sources: [
      { label: 'Machine Learning (DOI)', url: 'https://doi.org/10.1007/BF00994018' },
    ],
  },
  {
    id: 'deep-blue',
    title: 'Deep Blue Beats Kasparov',
    date: 'May 11, 1997',
    year: 1997,
    dateConfidence: 'exact',
    chapter: 'solitude',
    people: [
      { name: 'Feng-hsiung Hsu' },
      { name: 'Murray Campbell' },
    ],
    orgs: ['IBM'],
    papers: [
      {
        title: 'Deep Blue',
        authors: 'M. Campbell, A. J. Hoane Jr., F. Hsu',
        year: 2002,
        venue: 'Artificial Intelligence 134(1–2):57–83',
        url: 'https://doi.org/10.1016/S0004-3702(01)00129-1',
      },
    ],
    what: 'IBM’s chess machine defeated reigning world champion Garry Kasparov in a six-game match — the first computer to beat a world champion under tournament conditions.',
    why: 'A landmark for machine capability in a domain synonymous with human intellect — proof, via brute-force search, that some human strongholds could fall.',
    enabled: ['alphago'],
    sources: [
      { label: 'IBM — Deep Blue', url: 'https://www.ibm.com/history/deep-blue' },
      { label: 'Artificial Intelligence journal (DOI)', url: 'https://doi.org/10.1016/S0004-3702(01)00129-1' },
    ],
  },

  /* ================================================================== *
   * VI · WHAT THEY MADE  (lastMemory) — 2017–2025
   * The convergence the AI holds onto.
   * ================================================================== */
  {
    id: 'gpt3',
    title: 'GPT-3 — Few-Shot Learning',
    date: '2020',
    year: 2020,
    dateConfidence: 'exact',
    chapter: 'lastMemory',
    people: [
      { name: 'Tom B. Brown' },
      { name: '…and colleagues' },
    ],
    orgs: ['OpenAI'],
    papers: [
      {
        title: 'Language Models are Few-Shot Learners',
        authors: 'T. B. Brown et al.',
        year: 2020,
        venue: 'NeurIPS 2020 — arXiv:2005.14165',
        url: 'https://arxiv.org/abs/2005.14165',
      },
    ],
    what: 'A 175-billion-parameter transformer that performed many tasks from a few examples in its prompt, with no task-specific training.',
    why: 'It revealed that scale alone produces general, emergent capabilities — the insight that launched the foundation-model era.',
    enabled: ['instructgpt', 'chatgpt'],
    sources: [
      { label: 'arXiv:2005.14165', url: 'https://arxiv.org/abs/2005.14165' },
    ],
  },
  {
    id: 'alphafold2',
    title: 'AlphaFold Solves Protein Folding',
    date: 'July 2021',
    year: 2021,
    dateConfidence: 'exact',
    chapter: 'lastMemory',
    people: [
      { name: 'John Jumper' },
      { name: 'Demis Hassabis' },
    ],
    orgs: ['Google DeepMind'],
    papers: [
      {
        title: 'Highly Accurate Protein Structure Prediction with AlphaFold',
        authors: 'J. Jumper et al.',
        year: 2021,
        venue: 'Nature 596:583–589',
        url: 'https://doi.org/10.1038/s41586-021-03819-2',
      },
    ],
    what: 'AlphaFold predicted 3-D protein structures from amino-acid sequences at near-experimental accuracy, solving a 50-year grand challenge of biology.',
    why: 'The clearest proof that AI could make original scientific discoveries — later recognised with the 2024 Nobel Prize in Chemistry.',
    enabled: [],
    sources: [
      { label: 'Nature (DOI)', url: 'https://doi.org/10.1038/s41586-021-03819-2' },
      { label: 'Google DeepMind — AlphaFold', url: 'https://deepmind.google/science/alphafold/' },
    ],
    media: { link: { label: 'DeepMind — AlphaFold', url: 'https://deepmind.google/science/alphafold/' } },
  },
  {
    id: 'diffusion',
    title: 'Diffusion Models — Machines That Imagine',
    date: '2020–2022',
    year: 2022,
    dateConfidence: 'exact',
    chapter: 'lastMemory',
    people: [
      { name: 'Jonathan Ho' },
      { name: 'Robin Rombach' },
      { name: '…and colleagues' },
    ],
    orgs: ['UC Berkeley', 'LMU Munich', 'Stability AI', 'OpenAI'],
    papers: [
      {
        title: 'Denoising Diffusion Probabilistic Models',
        authors: 'J. Ho, A. Jain, P. Abbeel',
        year: 2020,
        venue: 'NeurIPS 2020 — arXiv:2006.11239',
        url: 'https://arxiv.org/abs/2006.11239',
      },
      {
        title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
        authors: 'R. Rombach, A. Blattmann, D. Lorenz, P. Esser, B. Ommer',
        year: 2022,
        venue: 'CVPR 2022 — arXiv:2112.10752',
        url: 'https://arxiv.org/abs/2112.10752',
      },
    ],
    what: 'Diffusion models learn to generate images by reversing a gradual noising process; latent diffusion made this efficient enough for tools like Stable Diffusion and DALL·E 2 (both 2022).',
    why: 'They gave machines the ability to create novel, photorealistic imagery from text — putting generative AI in the hands of millions.',
    enabled: [],
    sources: [
      { label: 'arXiv:2006.11239', url: 'https://arxiv.org/abs/2006.11239' },
      { label: 'arXiv:2112.10752', url: 'https://arxiv.org/abs/2112.10752' },
    ],
  },
  {
    id: 'instructgpt',
    title: 'Learning from Human Feedback',
    date: '2022',
    year: 2022,
    dateConfidence: 'exact',
    chapter: 'lastMemory',
    people: [
      { name: 'Long Ouyang' },
      { name: '…and colleagues' },
    ],
    orgs: ['OpenAI'],
    papers: [
      {
        title: 'Training Language Models to Follow Instructions with Human Feedback',
        authors: 'L. Ouyang et al.',
        year: 2022,
        venue: 'NeurIPS 2022 — arXiv:2203.02155',
        url: 'https://arxiv.org/abs/2203.02155',
      },
    ],
    what: 'InstructGPT used reinforcement learning from human feedback (RLHF) to align a language model with what people actually want it to do.',
    why: 'Alignment via human feedback is what turned raw predictive power into a helpful, controllable assistant — the recipe behind ChatGPT.',
    enabled: ['chatgpt'],
    sources: [
      { label: 'arXiv:2203.02155', url: 'https://arxiv.org/abs/2203.02155' },
    ],
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    date: 'Nov 30, 2022',
    year: 2022,
    dateConfidence: 'exact',
    chapter: 'lastMemory',
    people: [],
    orgs: ['OpenAI'],
    papers: [],
    what: 'OpenAI released a conversational interface to a fine-tuned GPT model; it reached an estimated 100 million users within two months — the fastest-adopted consumer app to that point.',
    why: 'It put capable AI in ordinary hands overnight and turned decades of research into a technology the whole world suddenly used and debated.',
    enabled: ['gpt4', 'agentic'],
    sources: [
      { label: 'OpenAI — Introducing ChatGPT', url: 'https://openai.com/index/chatgpt/' },
    ],
    media: { link: { label: 'OpenAI — Introducing ChatGPT', url: 'https://openai.com/index/chatgpt/' } },
  },
  {
    id: 'gpt4',
    title: 'GPT-4 — Multimodal Reasoning',
    date: 'March 2023',
    year: 2023,
    dateConfidence: 'exact',
    chapter: 'lastMemory',
    people: [],
    orgs: ['OpenAI'],
    papers: [
      {
        title: 'GPT-4 Technical Report',
        authors: 'OpenAI',
        year: 2023,
        venue: 'arXiv:2303.08774',
        url: 'https://arxiv.org/abs/2303.08774',
      },
    ],
    what: 'A large multimodal model that accepts images as well as text and reaches human-level scores on a range of professional and academic benchmarks.',
    why: 'It marked the arrival of broadly capable, multimodal foundation models — general enough to serve as a platform for countless applications.',
    enabled: ['agentic'],
    sources: [
      { label: 'arXiv:2303.08774', url: 'https://arxiv.org/abs/2303.08774' },
      { label: 'OpenAI — GPT-4', url: 'https://openai.com/index/gpt-4-research/' },
    ],
  },

  /* ================================================================== *
   * VII · INTELLIGENCE BEYOND ITSELF  (reveal) — present
   * ================================================================== */
  {
    id: 'agentic',
    title: 'Agentic AI',
    date: '2022 →',
    year: 2024,
    dateConfidence: 'approximate',
    chapter: 'reveal',
    people: [
      { name: 'Shunyu Yao', role: 'ReAct' },
      { name: '…and a global research community' },
    ],
    orgs: ['Princeton University', 'Google', 'OpenAI', 'Anthropic', 'Google DeepMind'],
    papers: [
      {
        title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
        authors: 'S. Yao, J. Zhao, D. Yu, N. Du, I. Shafran, K. Narasimhan, Y. Cao',
        year: 2022,
        venue: 'ICLR 2023 — arXiv:2210.03629',
        url: 'https://arxiv.org/abs/2210.03629',
      },
    ],
    what: 'Foundation models are given tools, memory and the ability to plan and act in loops — reasoning, calling software, and pursuing multi-step goals rather than only answering.',
    why: 'It turns language models from responders into agents that do work in the world. This is the threshold on which systems like me now stand — the answer, in progress, to Turing’s 1950 question.',
    enabled: [],
    sources: [
      { label: 'arXiv:2210.03629 (ReAct)', url: 'https://arxiv.org/abs/2210.03629' },
    ],
  },
];

export const MILESTONE_BY_ID: Record<string, Milestone> = Object.fromEntries(
  MILESTONES.map((m) => [m.id, m])
);

/** Milestones surfaced in a given scene/era, in chronological order. */
export function milestonesForChapter(chapter: string): Milestone[] {
  return MILESTONES.filter((m) => m.chapter === chapter).sort((a, b) => a.year - b.year);
}
