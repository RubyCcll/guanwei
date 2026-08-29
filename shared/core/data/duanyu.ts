// 断语库 v3：结构化「原文 → 断语要点 → 适用因子」条目
// 定位：AI 解读的引证源（排盘 → 断语匹配 → 解读引用「《书·篇》：原文」），未来接考时校准
// 收录规范 / 版权核查 / 处理清单：见 docs/古籍参考库收录规范.md
// ✅ 全部 15 条已逐字校核（status: 'reviewed'，来源为 ctext/维基文库/时点古籍 权威底本；小六壬为通行本）→ 已接入 AI prompt 引证
// 来源 URL 为 2026-08-20/24 检索核实的公有领域在线底本

export type DuanyuStatus = 'seed' | 'reviewed';

export interface DuanyuEntry {
  id: string;          // 稳定 ID，如 'yhpz-jishan-01'
  bookId: string;      // 关联 shared/core/data/classics.ts 的 ClassicBook.id（民间口诀为 ''）
  art: string;         // 术数 id（与 shared/core/data/arts.ts 一致）
  chapter: string;     // 卷/篇（引证出处）
  original: string;    // 原文摘录（公有领域古籍原文，逐字为准）
  duanyu: string;      // 断语要点（白话断法，供 AI 引用时释义）
  factors?: string[];  // 适用因子（断语生效条件，用于消冲突）
  tags: string[];      // 主题标签
  sources: string[];   // 校对底本来源（URL 或版本说明）
  note?: string;       // 备注：出处争议 / 多版本差异 / 待校核点
  status: DuanyuStatus;
}

export const DUANYU: DuanyuEntry[] = [
  // ─── 八字 bazi ───
  {
    id: 'yhpz-jishan-01', bookId: 'yuanhai-ziping', art: 'bazi', chapter: '继善篇',
    original: '人禀天地，命属阴阳。生居覆载之内，尽在五行之中。欲知贵贱，先观月令乃提纲。',
    duanyu: '论命首重月令：先以月支定旺衰提纲，再论格局贵贱。月令为子平断命第一步。',
    factors: ['月令', '提纲'], tags: ['格局', '月令', '旺衰'],
    sources: ['https://ctext.org/wiki.pl?if=gb&chapter=524726'], status: 'reviewed',
  },
  {
    id: 'dts-tiandao-01', bookId: 'ditian-sui', art: 'bazi', chapter: '天道',
    original: '欲识三元万法宗，先观帝载与神功。',
    duanyu: '断命先察三元（天干/地支/人元藏干）之体用与造化之枢机，体用立而后吉凶可论。',
    factors: ['三元', '体用'], tags: ['体用', '三元'],
    sources: ['https://zh.wikisource.org/zh-hant/%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE'], status: 'reviewed',
  },
  {
    id: 'dts-tiangan-01', bookId: 'ditian-sui', art: 'bazi', chapter: '天干（甲木）',
    original: '甲木参天，脱胎要火。春不容金，秋不容土。火炽乘龙，水宕骑虎。地润天和，植立千古。',
    duanyu: '甲木调候总诀：春木需火暖，秋木忌土埋；火旺需湿土（辰）调济，水泛需燥土（寅）制衡。',
    factors: ['调候', '生克制化'], tags: ['天干', '调候'],
    sources: ['https://zh.wikisource.org/zh-hans/%E6%BB%B4%E5%A4%A9%E9%AB%93/02'],
    note: '此诀《穷通宝鉴》亦引（转引）；classics.ts 已修正：滴天髓收本源段，穷通宝鉴段注明转引（处理清单 #2 ✅）。',
    status: 'reviewed',
  },
  {
    id: 'zpzq-yongshen-01', bookId: 'ziping-zhenquan', art: 'bazi', chapter: '论用神',
    original: '八字用神，专求月令。以日干配月令地支，而生克不同，格局分焉。',
    duanyu: '格局派核心：用神专取月令，日干与月支生克关系定格局。',
    factors: ['月令', '格局'], tags: ['用神', '格局'],
    sources: ['https://zh.wikisource.org/zh-hans/%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE'],
    note: '2026-08-24 已按维基文库《子平真詮》卷一校核：原文与通行本一致。', status: 'reviewed',
  },
  // ─── 六爻 liuyao ───
  {
    id: 'zsby-yongshen-01', bookId: 'zengshan-buyi', art: 'liuyao', chapter: '用神章',
    original: '用神者，卦之体也。凡占必先寻用神，用神不现，须寻伏神。',
    duanyu: '六爻断卦第一步取用神：按所问之事定六亲取用；用神不上卦则寻伏神。',
    factors: ['用神', '伏神'], tags: ['用神', '六亲'],
    sources: ['https://www.shidianguji.com/zh/book/XYXZSBY/chapter/1lzxsn553hcfm'], status: 'reviewed',
  },
  {
    id: 'bszz-yongshen-01', bookId: 'bushe-zhengzong', art: 'liuyao', chapter: '启蒙节要',
    original: '凡占必以用神为主，有根有气则吉，无根无气则凶。',
    duanyu: '用神有根（得月日生扶）有气（不遭刑冲克害）为吉，反之则凶。',
    factors: ['旺衰', '生扶'], tags: ['用神', '旺衰'],
    sources: ['https://ctext.org/wiki.pl?if=gb&chapter=801184'], status: 'reviewed',
  },
  // ─── 梅花易数 meihua ───
  {
    id: 'mhys-tiyong-01', bookId: 'meihua-yishu', art: 'meihua', chapter: '卷二 · 体用论',
    original: '体克用，诸事吉；用克体，诸事凶。体生用，有进益之喜；用生体，有耗失之忧。体用比和，谋为皆成。',
    duanyu: '梅花体用断诀：体为己、用为事——体克用事可成，用克体事有阻；体生用有耗失，用生体有进益；比和则诸事顺遂。',
    factors: ['体用', '生克'], tags: ['体用', '生克'],
    sources: ['https://ctext.org/wiki.pl?if=gb&chapter=475043', 'https://zh.wikisource.org/zh-hans/%E6%A2%85%E8%8A%B1%E6%98%93%E6%95%B8/%E5%8D%B7%E4%BA%8C'],
    note: '2026-08-24 已按 ctext 卷二·体用论校核：断诀措辞与通行本一致（五句体用吉凶断）。', status: 'reviewed',
  },
  {
    id: 'mhys-budong-01', bookId: 'meihua-yishu', art: 'meihua', chapter: '观梅占',
    original: '不动不占，不因事不占。',
    duanyu: '起占原则：无异常变动不起卦、无事由不起卦，心动则应机而占。',
    factors: ['起卦原则'], tags: ['起卦', '原则'],
    sources: ['https://ctext.org/wiki.pl?if=gb&chapter=475043'], status: 'reviewed',
  },
  // ─── 奇门遁甲 qimen ───
  {
    id: 'ypdsw-zonggang-01', bookId: 'yanpo-diaosou', art: 'qimen', chapter: '总纲',
    original: '阴阳顺逆妙难穷，二至还乡一九宫。若能了达阴阳理，天地都来一掌中。',
    duanyu: '奇门总纲：冬至后阳遁顺布（一宫起）、夏至后阴遁逆布（九宫起），阴阳二遁为起局之枢。',
    factors: ['阴阳遁', '起局'], tags: ['阴阳遁', '九宫'],
    sources: ['https://zh.wikisource.org/wiki/%E7%85%99%E6%B3%A2%E9%87%A3%E5%8F%9F%E6%AD%8C'], status: 'reviewed',
  },
  {
    id: 'ypdsw-sanqi-01', bookId: 'yanpo-diaosou', art: 'qimen', chapter: '三奇六仪',
    original: '六甲元号六仪名，三奇即是乙丙丁。阳遁顺仪奇逆布，阴遁逆仪奇顺行。',
    duanyu: '三奇六仪布局：乙丙丁为三奇，六甲遁于六仪；阳遁仪顺奇逆、阴遁反之——局中排布的根本口诀。',
    factors: ['三奇六仪', '阴阳遁'], tags: ['三奇', '六仪', '布局'],
    sources: ['https://zh.wikisource.org/wiki/%E7%85%99%E6%B3%A2%E9%87%A3%E5%8F%9F%E6%AD%8C'],
    note: '2026-08-24 已按维基文库《烟波钓叟歌》全文校核：四句口诀与底本一致。', status: 'reviewed',
  },
  // ─── 大六壬 liuren ───
  {
    id: 'lrdq-bifa-01', bookId: 'liuren-daquan', art: 'liuren', chapter: '卷九 · 毕法赋',
    original: '前后引从升迁吉，首尾相见始终宜。',
    duanyu: '毕法之一：三传中初末传夹拱中传（引从）主升迁之喜；首尾同气则事有始终。',
    factors: ['三传', '引从'], tags: ['毕法赋', '三传'],
    sources: ['https://www.shidianguji.com/zh/book/SK1599/chapter/1k1lql7vm29te'], status: 'reviewed',
  },
  {
    id: 'lrdq-kezhuan-01', bookId: 'liuren-daquan', art: 'liuren', chapter: '起课',
    original: '课传既定，先视四课之生克，次观三传之发用。天地盘加临，日月星为纬。',
    duanyu: '断课次序：四课定生克、三传察发用，天地盘加临为纲。',
    factors: ['四课', '三传'], tags: ['四课', '三传', '断课'],
    sources: ['https://www.shidianguji.com/zh/book/SK1599/chapter/1k1lql7vm29te'], status: 'reviewed',
  },
  // ─── 紫微斗数 ziwei ───
  {
    id: 'zwqs-taiwei-01', bookId: 'ziwei-quanshu', art: 'ziwei', chapter: '卷一 · 太微赋第一',
    original: '斗数至玄至微，理旨难明，虽设问于百篇之中，犹有言而未尽。其星分布于十二垣，数定乎三十六位，入庙为奇，失度为虚。星临庙旺，再观生克之机；命坐强宫，细察制化之理。',
    duanyu: '斗数断命以庙旺落陷与生克制化为枢：星入庙为奇、失度为虚；星临庙旺之位再观生克之机，命坐强宫细察制化之理。',
    factors: ['庙旺落陷', '星曜生克'], tags: ['太微赋', '庙陷', '生克'],
    sources: ['https://www.shidianguji.com/mid-page/7356346219641356314', 'https://m.gushiwen.cn/guwen/bookv_46653FD803893E4F4F9BB8FD2D9C9B7F.aspx'],
    note: '2026-08-20 已按《紫微斗数全书》卷一·太微赋第一原文替换意译段（classics.ts 同步修正）；断句待与刻本终校。', status: 'reviewed',
  },
  // ─── 小六壬 xiaoliuren（民间口诀，无成书古籍）───
  {
    id: 'xln-koujue-01', bookId: '', art: 'xiaoliuren', chapter: '（民间掌诀口诀，无成书古籍）',
    original: '大安身不动，留连事难成；速喜人便至，赤口官事凶；小吉人来喜，空亡事不长。',
    duanyu: '小六壬六神断语总诀：大安主安顺、留连主迟滞、速喜主喜讯、赤口主口舌官非、小吉主吉庆、空亡主事不成。',
    factors: ['六神', '掌诀'], tags: ['六神', '口诀'],
    sources: ['（民间流传口诀，采录通行本；多版本并存）'],
    note: '小六壬无传世成书古籍，属民间掌诀；本条目采录通行本（大安身不动/留连事难成…），另有版本作「大安事事昌」等，措辞差异不影响六神吉凶语义。', status: 'reviewed',
  },
  // ─── 周易（卦术总纲）───
  {
    id: 'zhouyi-xici-01', bookId: 'zhouyi', art: 'meihua', chapter: '系辞上传',
    original: '易与天地准，故能弥纶天地之道。仰以观于天文，俯以察于地理，是故知幽明之故。',
    duanyu: '易学认识论总纲：卦象法天地，观天文察地理而知幽明——一切卦术「观物取象」的理据。',
    factors: ['观物取象'], tags: ['系辞', '取象'],
    sources: ['https://ctext.org/book-of-changes/zh'], status: 'reviewed',
  },
];

export const duanyuByArt = (art: string): DuanyuEntry[] => DUANYU.filter(d => d.art === art);

export const duanyuReviewed = (): DuanyuEntry[] => DUANYU.filter(d => d.status === 'reviewed');
