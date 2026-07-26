# Source audit — the AI-history content

Every historical claim the experience presents is defined in
`src/lib/history/milestones.ts` and traces to a reputable primary or
authoritative secondary source. This file is the audit map: milestone →
what it asserts → citation. Dates flagged `approximate` or `disputed` in the
data are shown that way in the UI (e.g. "c. 1970"), never as false precision.

Verification method: the well-established facts and arXiv-era paper identifiers
were confirmed directly; the pre-arXiv classics and exact dates were checked via
web search against publisher/DOI pages, official archives, and primary reprints
(July 2026). No fact, date, quote, or attribution is invented. Where a person
list is abbreviated ("…and colleagues") the full author list is on the linked
paper.

## The Question (1936–1956)

- **turing-machine** — Turing, "On Computable Numbers…", Proc. London Math. Soc., 1936. DOI 10.1112/plms/s2-42.1.230.
- **mcculloch-pitts** — McCulloch & Pitts, "A Logical Calculus of the Ideas Immanent in Nervous Activity", Bull. Math. Biophysics 5:115–133, 1943. DOI 10.1007/BF02478259.
- **turing-test** — Turing, "Computing Machinery and Intelligence", Mind LIX(236):433–460, 1950. DOI 10.1093/mind/LIX.236.433.
- **dartmouth** — McCarthy, Minsky, Rochester, Shannon, "A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence", 1955 (workshop 1956); reprint AI Magazine 27(4), 2006, DOI 10.1609/aimag.v27i4.1904. First print appearance of the term "artificial intelligence"; Stanford/McCarthy archive corroborates.

## The First Believers (1957–1973)

- **logic-theorist** — Newell & Simon, "The Logic Theory Machine", IRE Trans. Information Theory, 1956. DOI 10.1109/TIT.1956.1056797.
- **perceptron** — Rosenblatt, "The Perceptron…", Psychological Review 65(6):386–408, 1958. DOI 10.1037/h0042519. (Mark I Perceptron hardware followed; the 1958 paper is the anchor.)
- **samuel-checkers** — Samuel, "Some Studies in Machine Learning Using the Game of Checkers", IBM J. R&D 3(3):210–229, 1959. DOI 10.1147/rd.33.0210. Coins "machine learning".
- **eliza** — Weizenbaum, "ELIZA…", Communications of the ACM 9(1):36–45, Jan 1966. DOI 10.1145/365153.365168.
- **shakey** — SRI International, Shakey the Robot (1966–1972). Date flagged *approximate* (project span). Source: sri.com/hoi/shakey-the-robot. Produced A* and STRIPS.
- **shrdlu** — Winograd, MIT AI-TR-235, 1971 (work c. 1970, flagged *approximate*). MIT DSpace 1721.1/7095.

## The Explosion (2006–2023)

- **deep-belief-nets** — Hinton, Osindero, Teh, "A Fast Learning Algorithm for Deep Belief Nets", Neural Computation 18(7):1527–1554, 2006. DOI 10.1162/neco.2006.18.7.1527.
- **imagenet** — Deng, Dong, Socher, Li, Li, Fei-Fei, "ImageNet: A Large-Scale Hierarchical Image Database", IEEE CVPR 2009. DOI 10.1109/CVPR.2009.5206848.
- **alexnet** — Krizhevsky, Sutskever, Hinton, "ImageNet Classification with Deep CNNs", NeurIPS 2012. papers.nips.cc.
- **word2vec** — Mikolov, Chen, Corrado, Dean, arXiv:1301.3781, 2013.
- **seq2seq** — Sutskever, Vinyals, Le, arXiv:1409.3215, 2014; Bahdanau, Cho, Bengio (attention), arXiv:1409.0473, 2014.
- **alphago** — Silver et al., "Mastering the Game of Go…", Nature 529:484–489, 2016; match vs. Lee Sedol March 2016. DOI 10.1038/nature16961.
- **transformer** — Vaswani et al., "Attention Is All You Need", NeurIPS 2017, arXiv:1706.03762.
- **bert** — Devlin, Chang, Lee, Toutanova, arXiv:1810.04805, 2018.
- **gpt1** — Radford, Narasimhan, Salimans, Sutskever, "Improving Language Understanding by Generative Pre-Training", OpenAI, 2018.

## The Winters (1969–1993)

- **perceptrons-book** — Minsky & Papert, *Perceptrons*, MIT Press, 1969.
- **lighthill** — Lighthill, "Artificial Intelligence: A General Survey", UK Science Research Council, 1973. Full text: chilton-computing.org.uk. Triggered UK cuts + 1974 DARPA reductions.
- **expert-systems** — McDermott, "R1: A Rule-Based Configurer…", Artificial Intelligence 19(1):39–88, 1982, DOI 10.1016/0004-3702(82)90021-2 (XCON/R1 at DEC); MYCIN/DENDRAL at Stanford. Boom span flagged *approximate*.
- **ai-winter-2** — Collapse of the LISP-machine market and expert-systems maintenance costs, c. 1987–1993 (flagged *approximate*). Overview: en.wikipedia.org/wiki/AI_winter (secondary; used as pointer, not primary claim).

## The Quiet Years (1986–2006)

- **backprop** — Rumelhart, Hinton, Williams, "Learning Representations by Back-Propagating Errors", Nature 323:533–536, 1986. DOI 10.1038/323533a0. Precursors noted in-text (Linnainmaa 1970; Werbos 1974).
- **lenet** — LeCun, Bottou, Bengio, Haffner, "Gradient-Based Learning Applied to Document Recognition", Proc. IEEE 86(11):2278–2324, 1998 (CNN work from 1989; span flagged *approximate*). DOI 10.1109/5.726791.
- **lstm** — Hochreiter & Schmidhuber, "Long Short-Term Memory", Neural Computation 9(8):1735–1780, 1997. DOI 10.1162/neco.1997.9.8.1735.
- **svm** — Cortes & Vapnik, "Support-Vector Networks", Machine Learning 20:273–297, 1995. DOI 10.1007/BF00994018.
- **deep-blue** — IBM Deep Blue defeats Kasparov, May 11, 1997. IBM history page; Campbell, Hoane, Hsu, "Deep Blue", Artificial Intelligence 134:57–83, 2002, DOI 10.1016/S0004-3702(01)00129-1.

## What They Made (2017–2025)

- **gpt3** — Brown et al., "Language Models are Few-Shot Learners", NeurIPS 2020, arXiv:2005.14165.
- **alphafold2** — Jumper et al., "Highly Accurate Protein Structure Prediction with AlphaFold", Nature 596:583–589, July 2021. DOI 10.1038/s41586-021-03819-2.
- **diffusion** — Ho, Jain, Abbeel (DDPM), arXiv:2006.11239, 2020; Rombach et al. (Latent Diffusion / Stable Diffusion), arXiv:2112.10752, 2022. DALL·E 2 / Stable Diffusion public in 2022.
- **instructgpt** — Ouyang et al., "Training Language Models to Follow Instructions with Human Feedback", NeurIPS 2022, arXiv:2203.02155.
- **chatgpt** — OpenAI, "Introducing ChatGPT", Nov 30, 2022. openai.com/index/chatgpt.
- **gpt4** — OpenAI, "GPT-4 Technical Report", arXiv:2303.08774, March 2023.

## Intelligence Beyond Itself (present)

- **agentic** — Tool-using, planning foundation-model agents. Anchor paper: Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models", ICLR 2023, arXiv:2210.03629. Date "2022 →" flagged *approximate* as this is an ongoing, active frontier (content stays at the level of cited work; no claims are made about unpublished/post-cutoff specifics).

## Editorial notes

- Author lists abbreviated as "…and colleagues" in the UI are complete on the linked paper.
- Secondary encyclopaedia links (AI winter) are used only as navigational pointers to well-documented events, not as the basis for a specific contested claim.
- The dependency edges (`enabled`) express *direct* intellectual/technical enablement and are editorial connections grounded in the standard historiography of the field; they are presented as a lineage, not as claims of sole causation.
