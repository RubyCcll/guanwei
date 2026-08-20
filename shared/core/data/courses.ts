// 观微学馆课程数据

export interface CourseChapter {
  title: string;
  body: string;
}

export interface CourseExercise {
  prompt: string;
  answer: string;
  explain: string;
}

export interface Course {
  id: string;
  art: string;      // 关联术数 id 或 'foundation' / 'dao'
  title: string;
  level: '入门' | '进阶';
  summary: string;
  chapters: CourseChapter[];
  exercises: CourseExercise[];
  relatedClassics: string[];
}

export const COURSES: Course[] = [
  {
    id: 'foundation-wuxing', art: 'foundation', title: '五行生克', level: '入门',
    summary: '五行是玄学世界的底层语法，理解生克关系，便握住了万象变化的钥匙。',
    chapters: [
      { title: '五行的属性', body: '木曰曲直（生长舒展）、火曰炎上（温热明亮）、土曰稼穑（承载生化）、金曰从革（肃杀收敛）、水曰润下（寒凉流动）。' },
      { title: '相生之理', body: '木生火、火生土、土生金、金生水、水生木。生者如母之育子，为助力、滋养之源。' },
      { title: '相克之理', body: '木克土、土克水、水克火、火克金、金克木。克者如官之治民，为约束、制衡之力。' },
    ],
    exercises: [
      { prompt: '火生什么？火克什么？', answer: '火生土；火克金', explain: '火燃烧后化为灰土，故火生土；火能熔化金属，故火克金。' },
    ],
    relatedClassics: ['zhouyi'],
  },
  {
    id: 'foundation-ganzhi', art: 'foundation', title: '天干地支', level: '入门',
    summary: '十天干十二地支是时间与空间的坐标，干支组合成六十甲子，循环往复纪年纪月纪日纪时。',
    chapters: [
      { title: '十天干', body: '甲乙丙丁戊己庚辛壬癸。甲丙戊庚壬为阳，乙丁己辛癸为阴；甲乙属木，丙丁属火，戊己属土，庚辛属金，壬癸属水。' },
      { title: '十二地支', body: '子丑寅卯辰巳午未申酉戌亥。子寅辰午申戌为阳，丑卯巳未酉亥为阴；寅卯属木，巳午属火，申酉属金，亥子属水，辰戌丑未属土。' },
      { title: '六十甲子', body: '天干配地支，阳干配阳支、阴干配阴支，依次组合六十年一轮回，称六十甲子。用于纪年、纪月、纪日、纪时。' },
    ],
    exercises: [
      { prompt: '2024 年是甲辰年，2025 年是什么年？', answer: '乙巳年', explain: '甲后为乙，辰后为巳，干支顺次推进，故为乙巳年。' },
    ],
    relatedClassics: ['zhouyi'],
  },
  {
    id: 'foundation-nayin', art: 'foundation', title: '六十甲子与纳音', level: '入门',
    summary: '纳音以两干两支组合为一象，三十纳音配五行六局，是紫微定局、八字论音的重要工具。',
    chapters: [
      { title: '纳音之法', body: '六十甲子每两组配一纳音，共三十种：海中金、炉中火、大林木、路旁土、剑锋金、山头火……' },
      { title: '五行局', body: '纳音归五行，如海中金、剑锋金等六种金音皆属金四局；紫微斗数据此定五行局以安紫微。' },
    ],
    exercises: [
      { prompt: '甲子年的纳音是什么？属什么局？', answer: '海中金；金四局', explain: '甲子乙丑海中金，六金纳音皆配金四局。' },
    ],
    relatedClassics: ['sanming-tonghui'],
  },
  {
    id: 'foundation-gua', art: 'foundation', title: '八卦与六十四卦', level: '入门',
    summary: '八卦取象天地雷风水火山泽，两两相重成六十四卦，是易占的根本模型。',
    chapters: [
      { title: '八卦取象', body: '乾☰天（金）、坤☷地（土）、震☳雷（木）、巽☴风（木）、坎☵水（水）、离☲火（火）、艮☶山（土）、兑☱泽（金）。' },
      { title: '先天数', body: '梅花易数用先天数：乾一、兑二、离三、震四、巽五、坎六、艮七、坤八。' },
      { title: '重卦成象', body: '八卦上下相重得六十四卦，如乾上乾下为乾为天，坎上离下为水火既济。' },
    ],
    exercises: [
      { prompt: '震卦的先天数是多少？五行属什么？', answer: '先天数四；属木', explain: '震为雷，先天数四，五行属木。' },
    ],
    relatedClassics: ['zhouyi'],
  },
  {
    id: 'foundation-yinyang', art: 'foundation', title: '阴阳学说', level: '入门',
    summary: '一阴一阳之谓道。阴阳的对立、互根、消长、转化，是理解一切术数的总纲。',
    chapters: [
      { title: '阴阳之义', body: '阳主动、明、刚、外、热；阴主静、暗、柔、内、寒。两者对立统一，互相转化。' },
      { title: '占问之用', body: '爻分阴阳、干分阴阳、宫分阴阳。断卦先辨阴阳消长，此为观微之始。' },
    ],
    exercises: [
      { prompt: '白天与黑夜，何者为阳？', answer: '白天为阳', explain: '阳主光明主动，故白昼属阳，黑夜属阴。' },
    ],
    relatedClassics: ['zhouyi'],
  },
  {
    id: 'bazi-basic', art: 'bazi', title: '八字基础：四柱与十神', level: '入门',
    summary: '从年柱到日柱，从五行到十神，认识子平术的基本框架。',
    chapters: [
      { title: '四柱排定', body: '年柱以立春为界，月柱以节气为纲，日柱以历法为准，时柱以时辰定之。本书四柱均按精确节气与真太阳时排定。' },
      { title: '十神之义', body: '以日干为主：生我者印，我生者食伤，克我者官杀，我克者财，同我者比劫。阴阳同则为偏、异则为正。' },
      { title: '日主强弱', body: '日主得月令生扶、四柱印比多者为身强，反之克泄耗多者为身弱。强弱定，喜忌出。' },
    ],
    exercises: [
      { prompt: '日干为甲（木），见庚（金）为何神？', answer: '七杀', explain: '金克木为官杀，甲为阳木、庚为阳金，阴阳同故为七杀（偏官）。' },
    ],
    relatedClassics: ['yuanhai-ziping', 'ditian-sui', 'ziping-zhenquan'],
  },
  {
    id: 'ziwei-basic', art: 'ziwei', title: '紫微入门：主星与宫垣', level: '入门',
    summary: '认识十四主星的性情与十二宫垣的领域，读懂一张紫微盘。',
    chapters: [
      { title: '十四主星', body: '紫微系六星（紫微、天机、太阳、武曲、天同、廉贞）与天府系八星（天府、太阴、贪狼、巨门、天相、天梁、七杀、破军）。' },
      { title: '十二宫垣', body: '命宫、兄弟、夫妻、子女、财帛、疾厄、迁移、仆役、官禄、田宅、福德、父母。命宫为枢，官禄财帛为用。' },
    ],
    exercises: [
      { prompt: '紫微星的代表意义是什么？', answer: '帝星，主尊贵格局与领导力', explain: '紫微为北斗帝星，象征至尊、格局与统御。' },
    ],
    relatedClassics: ['ziwei-quanshu'],
  },
  {
    id: 'meihua-basic', art: 'meihua', title: '梅花起卦入门', level: '入门',
    summary: '学会时间起卦与报数起卦，看懂本卦、互卦、变卦与体用生克。',
    chapters: [
      { title: '起卦之法', body: '时间起卦以年支序、月、日之和定上卦，加时数定下卦与动爻；报数起卦以三数定上下卦与动爻。' },
      { title: '体用生克', body: '无动爻之卦为体（事主），有动爻之卦为用（所问）。用生体吉、体克用吉、用克体凶、体生用泄气、比和平。' },
    ],
    exercises: [
      { prompt: '报数 1、2、3 起卦：上卦下卦各是什么？', answer: '上乾下兑（天泽履），动爻三', explain: '1 取乾（先天数一），2 取兑（先天数二），3 定动爻。' },
    ],
    relatedClassics: ['meihua-yishu'],
  },
  {
    id: 'liuyao-basic', art: 'liuyao', title: '六爻摇卦入门', level: '入门',
    summary: '三枚铜钱六次成卦，看懂阴阳老少四象与动变之机。',
    chapters: [
      { title: '摇卦之法', body: '三枚铜钱同掷，三背为老阳、三字为老阴、二背一字为少阳、一背二字为少阴。自下而上六次成卦。' },
      { title: '动变之义', body: '老阳老阴为动爻，动则变：阳变阴、阴变阳。本卦为现局，变卦为归趋，动爻为事机。' },
    ],
    exercises: [
      { prompt: '三枚铜钱掷出两背一字，是什么？', answer: '少阳', explain: '二背一字为少阳，属阳爻不动。' },
    ],
    relatedClassics: ['zengshan-buyi', 'bushe-zhengzong', 'zhouyi'],
  },
  {
    id: 'xiaoliuren-basic', art: 'xiaoliuren', title: '小六壬掌诀入门', level: '入门',
    summary: '六掌玄机，掐指即知。大安起月、月上起日、日上起时。',
    chapters: [
      { title: '六掌定位', body: '大安、留连、速喜、赤口、小吉、空亡六位，循环于掌上，顺数取位。' },
      { title: '吉凶要义', body: '大安、速喜、小吉为吉；留连、赤口、空亡为凶。结合五行方位与主数综合断之。' },
    ],
    exercises: [
      { prompt: '正月初一子时占，得什么？', answer: '大安', explain: '大安起月，正月落大安；初一仍在大安；子时（一数）顺数一位仍为大安。' },
    ],
    relatedClassics: [],
  },
  {
    id: 'qimen-basic', art: 'qimen', title: '奇门九宫入门', level: '入门',
    summary: '认识洛书九宫、八门九星与三奇六仪，看懂一张奇门盘。',
    chapters: [
      { title: '九宫八门', body: '洛书九宫：坎一坤二震三巽四中五乾六兑七艮八离九。八门：休生伤杜景死惊开。' },
      { title: '阴阳遁与局', body: '冬至后阳遁顺布，夏至后阴遁逆布；每节气分上中下三元，各配局数。' },
    ],
    exercises: [
      { prompt: '开门在哪个方位？主什么？', answer: '西北乾宫，主吉庆通达', explain: '开门居乾宫西北，为八门中最吉之门。' },
    ],
    relatedClassics: ['yanpo-diaosou'],
  },
  {
    id: 'liuren-basic', art: 'liuren', title: '大六壬月将入门', level: '入门',
    summary: '月将随太阳过宫，月将加时立天地盘，四课三传断人事始终。',
    chapters: [
      { title: '月将之要', body: '月将即太阳所在之宫，中气过宫换将。如雨水后为亥将登明，春分后为戌将河魁。' },
      { title: '四课三传', body: '日干遁干为干上，干支互乘得四课；三传示事之始终：初传事发之端，中传事进之中，末传事成之归。' },
    ],
    exercises: [
      { prompt: '雨水节气后月将为何？', answer: '亥将（登明）', explain: '雨水（约 2/19）后太阳过宫入亥，故为亥将登明。' },
    ],
    relatedClassics: ['liuren-daquan'],
  },
  {
    id: 'dao-jingcheng', art: 'dao', title: '占问之道：静诚悟', level: '入门',
    summary: '观微三法——静以定心、诚以聚气、悟以观照。占问之前，先正其心。',
    chapters: [
      { title: '静', body: '占问先定心。独处一室，屏息凝神，一念一事，方得应验。' },
      { title: '诚', body: '心诚则气聚，气聚则象显。同问不三占，三占必有疑，疑则不验。' },
      { title: '悟', body: '术者，渡舟也，非彼岸也。卦象所指，是镜非命。观照自身，反求诸己。' },
    ],
    exercises: [],
    relatedClassics: ['zhouyi'],
  },
  {
    id: 'tarot-basic', art: 'tarot', title: '塔罗大阿卡纳之旅', level: '入门',
    summary: '二十二张大阿卡纳是灵魂成长的旅程地图，从愚者到世界。',
    chapters: [
      { title: '愚者到战车', body: '愚者启程（0），魔术师掌创造（Ⅰ），女祭司守直觉（Ⅱ），皇后育丰饶（Ⅲ），皇帝立秩序（Ⅳ），教皇传师道（Ⅴ），恋人择真心（Ⅵ），战车克敌制胜（Ⅶ）。' },
      { title: '力量到世界', body: '力量以柔克刚（Ⅷ），隐士独行求索（Ⅸ），命运之轮顺势（Ⅹ），正义明断（Ⅺ），倒吊人换位（Ⅻ），死神蜕旧（XIII），节制中和（XIV），恶魔直面欲望（XV），高塔破立（XVI），星星怀希望（XVII），月亮信直觉（XVIII），太阳见光明（XIX），审判觉醒来（XX），世界归于圆满（XXI）。' },
    ],
    exercises: [
      { prompt: '大阿卡纳中「愚者」的数字是多少？', answer: '0', explain: '愚者编号 0，代表旅程之始与无限可能。' },
    ],
    relatedClassics: [],
  },
  {
    id: 'astrology-basic', art: 'astrology', title: '星座与行星入门', level: '入门',
    summary: '太阳主自我、月亮主情感、上升主处世，认识七行星与十二星座的语言。',
    chapters: [
      { title: '三大支柱', body: '太阳星座：自我核心与人生目标；月亮星座：情感需求与内在底色；上升星座：处世面具与第一印象。' },
      { title: '相位之语', body: '合相凝聚、六合和谐、拱相顺遂、刑相紧张、冲相对峙。相位是行星之间的对话方式。' },
    ],
    exercises: [
      { prompt: '上升星座由什么决定？', answer: '出生时刻与出生地经纬度', explain: '上升点是出生时刻东方地平线升起的星座，依赖精确时刻与地点计算。' },
    ],
    relatedClassics: [],
  },
];

export const courseById = (id: string) => COURSES.find(c => c.id === id);