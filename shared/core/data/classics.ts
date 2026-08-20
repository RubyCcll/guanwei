// 古籍典藏数据：12 部典籍元数据 + 原文选段（含注译与来源标注）
// 选段为公开领域原文整理，版本来源标注见 sourceNote

export interface ClassicExcerpt {
  title: string;
  source: string;
  original: string;
  translation?: string;
  annotation?: string;
}

export interface ClassicBook {
  id: string;
  title: string;
  author: string;
  era: string;
  arts: string[];   // 关联术数 id
  summary: string;
  background: string;
  chapters: { title: string; summary: string }[];
  excerpts: ClassicExcerpt[];
  sourceNote: string;
}

export const CLASSICS: ClassicBook[] = [
  {
    id: 'yuanhai-ziping', title: '渊海子平', author: '题宋·徐大升编，托名徐子平', era: '宋代', arts: ['bazi'],
    summary: '子平术的奠基之作，首次系统确立以日干为体、以月令为纲的论命体系，为四柱八字的正脉源头。',
    background: '唐代李虚中以年月日三柱推命，至宋代徐子平加入时柱，四柱完备。本书由徐大升辑录整理，明清以后成为子平命理入门必读。',
    chapters: [
      { title: '论五行所生之始', summary: '五行源流与干支属性' },
      { title: '论天干地支所出', summary: '干支纪时与阴阳配合' },
      { title: '论日干为主', summary: '确立日干为命主之体' },
      { title: '继善篇', summary: '命理总纲与格局要义' },
    ],
    excerpts: [
      {
        title: '继善篇（节选）', source: '《渊海子平·继善篇》',
        original: '人禀天地，命属阴阳。生居覆载之内，尽在五行之中。欲知贵贱，先观月令乃提纲。',
        translation: '人受天地之气而生，命运归属阴阳消长。人生于天地之间，都在五行运行之中。要知命之贵贱，先看月令——它是判断格局的总纲。',
        annotation: '「月令乃提纲」：月支为命局旺衰之枢纽，子平术论命首重月令，此句为全书纲领。',
      },
      {
        title: '论日干为主（节选）', source: '《渊海子平》',
        original: '取日干为主，以年为根，以月为苗，以日为花，以时为果。',
        translation: '以日干为命主自身，年柱如根、月柱如苗、日柱如花、时柱如果。',
        annotation: '根苗花果之喻：年主祖上幼年，月主父母青年，日主自身中年，时主子女暮年。',
      },
    ],
    sourceNote: '据通行《渊海子平》点校本整理（明刻本系统），原文选段属公开领域。',
  },
  {
    id: 'sanming-tonghui', title: '三命通会', author: '明·万民英', era: '明代', arts: ['bazi'],
    summary: '明代命学集大成之作，十二卷巨帙，汇历代命书精要，于纳音、神煞、格局、大运无所不包。',
    background: '万民英（1521-1603）官至福建布政司参议，博采《渊海子平》《星平会海》等数十家命书，删繁就简而成此编。',
    chapters: [
      { title: '论天干地支', summary: '干支阴阳五行总论' },
      { title: '论纳音取象', summary: '三十纳音之象义' },
      { title: '论十神', summary: '十神定义与生克' },
      { title: '论大运', summary: '大运起法与行运吉凶' },
    ],
    excerpts: [
      {
        title: '论人元司令（节选）', source: '《三命通会·卷一》',
        original: '天气始于甲，地气始于子，子甲相合，命曰岁立。谨候其时，气可与期。',
        translation: '天干之气从甲开始，地支之气从子开始，子与甲相配，便确立了岁序。恭敬地等待时令，气运便可预期。',
        annotation: '甲子相配为六十甲子之首，岁立即历法纪元之始，命理以干支纪时推气运。',
      },
    ],
    sourceNote: '据《四库全书》本与清刻本整理，选段属公开领域。',
  },
  {
    id: 'ditian-sui', title: '滴天髓阐微', author: '清·任铁樵注', era: '清代', arts: ['bazi'],
    summary: '命理经典《滴天髓》的阐发注本，以「天道、地道、人道」三篇立论，重体用、论源流，为子平术登堂入室之阶。',
    background: '《滴天髓》相传为京图撰、刘伯温注；清代任铁樵以毕生实践逐句阐发，举六百余例证，成为近代命理研习的巅峰文本。',
    chapters: [
      { title: '天道篇', summary: '体用与生克' },
      { title: '地道篇', summary: '旺衰与四时' },
      { title: '人道篇', summary: '格局与形象' },
    ],
    excerpts: [
      {
        title: '天道（节选）', source: '《滴天髓阐微·天道》',
        original: '欲识三元万法宗，先观帝载与神功。坤元合德玄机妙，惟向胞胎仔细穷。',
        translation: '要认识天干、地支、人元这三元的根本法则，先要观察天道承载与造化的功用。地道与天道合德，玄机精妙，须从命局根基处仔细推究。',
        annotation: '三元指天干、地支、藏干；「帝载神功」喻阴阳造化的根本力量。',
      },
    ],
    sourceNote: '据民国校印本整理，选段属公开领域。',
  },
  {
    id: 'ziping-zhenquan', title: '子平真诠', author: '清·沈孝瞻', era: '清代', arts: ['bazi'],
    summary: '专论格局之法，以月令为经、用神为纬，条分缕析正官、七杀、财、印、食伤诸格，为格局派的圭臬。',
    background: '沈孝瞻精研子平数十年，其论以「格局」立骨，纠正了明清以来重神煞轻格局的风气。',
    chapters: [
      { title: '论用神', summary: '月令取用之道' },
      { title: '论正官格', summary: '正官格的成破' },
      { title: '论财格', summary: '财格之喜忌' },
    ],
    excerpts: [
      {
        title: '论用神（节选）', source: '《子平真诠》',
        original: '八字用神，专求月令。以日干配月令地支，而生克不同，格局分焉。',
        translation: '八字的用神，专门从月令中寻求。以日干配合月令地支，因生克关系不同，格局便由此区分。',
        annotation: '用神为命局之枢纽，本书主张「专求月令」，是格局派的核心主张。',
      },
    ],
    sourceNote: '据《子平真诠》通行本整理，选段属公开领域。',
  },
  {
    id: 'qiongtong-baojian', title: '穷通宝鉴', author: '清·余春台辑', era: '清代', arts: ['bazi'],
    summary: '按月令十干逐一论其喜忌用神，以「调候」为纲，务实好用，为实践派命理推崇的案头之书。',
    background: '原为《栏江网》抄本，余春台整理为《穷通宝鉴》，专论十干在各月令的穷通喜忌，调候之法由此大行。',
    chapters: [
      { title: '论甲木', summary: '甲木十二月喜忌' },
      { title: '论丙火', summary: '丙火十二月喜忌' },
      { title: '论壬水', summary: '壬水十二月喜忌' },
    ],
    excerpts: [
      {
        title: '论甲木（节选）', source: '《穷通宝鉴·甲木》',
        original: '甲木参天，脱胎要火。春不容金，秋不容土。火炽乘龙，水宕骑虎。',
        translation: '甲木如参天大树，初生时需要火来温暖生发。春天木旺不喜金来克伐，秋天木衰不喜土重埋根。火太旺时要有湿土（辰龙）来泄，水太旺时要有燥土（寅虎）来制。',
        annotation: '此为甲木调候总诀，涉及五行制化与十二长生，是穷通论命的核心示例。',
      },
    ],
    sourceNote: '据《穷通宝鉴》通行本整理，选段属公开领域。',
  },
  {
    id: 'ziwei-quanshu', title: '紫微斗数全书', author: '题明·罗洪先序，托名陈抟所传', era: '明代', arts: ['ziwei'],
    summary: '紫微斗数最重要的传世文本，系统记载安星法、十二宫、十四主星与诸星曜的庙旺落陷，是斗数研习的源头。',
    background: '传说紫微斗数由北宋陈抟创立，明代始有刊本流布。全书以「紫微星垣」为纲，与八字并称命理双璧。',
    chapters: [
      { title: '安星诀', summary: '命宫身宫与诸星安法' },
      { title: '诸星问答', summary: '十四主星性情论' },
      { title: '论十二宫', summary: '十二宫分论' },
    ],
    excerpts: [
      {
        title: '太微赋（节选）', source: '《紫微斗数全书·太微赋》',
        original: '斗数至玄至微，命理甚深甚奥。星曜见生克之机，宫垣有庙陷之数。',
        translation: '紫微斗数极其玄妙精微，命理极为深远奥妙。星曜之间可见生克制化的机枢，宫垣之中有庙旺落陷的定数。',
        annotation: '「庙旺落陷」为斗数断吉凶的核心概念，星曜得地与否决定力量强弱。',
      },
    ],
    sourceNote: '据《紫微斗数全书》坊刻本整理，选段属公开领域。',
  },
  {
    id: 'zhouyi', title: '周易', author: '伏羲画卦，文王系辞，孔子作传', era: '先秦', arts: ['liuyao', 'meihua'],
    summary: '群经之首，中国思想的源头活水。六十四卦三百八十四爻，以阴阳变化通贯天人，是六爻、梅花等一切卦术的根基。',
    background: '《周易》由经（卦爻辞）与传（十翼）组成。其「观物取象」「穷理尽性」的思维，塑造了整个东方文化的底层结构。',
    chapters: [
      { title: '乾卦', summary: '刚健中正之象' },
      { title: '坤卦', summary: '柔顺厚德之象' },
      { title: '系辞上传', summary: '易学总论' },
    ],
    excerpts: [
      {
        title: '乾卦（节选）', source: '《周易·乾卦》',
        original: '元亨利贞。天行健，君子以自强不息。',
        translation: '乾卦象征创始、通达、和合、正固。天道运行刚健不息，君子应效法它，自强不息地奋进。',
        annotation: '「元亨利贞」为四德，天行健句为孔子《大象传》对乾卦的发挥。',
      },
      {
        title: '系辞上传（节选）', source: '《周易·系辞上》',
        original: '易与天地准，故能弥纶天地之道。仰以观于天文，俯以察于地理，是故知幽明之故。',
        translation: '《易》与天地相准，因此能包罗天地的法则。抬头观察天文，俯身考察地理，因此能知晓幽暗与显明的事理。',
        annotation: '此为易学认识论的经典表述：观天察地而通幽明。',
      },
    ],
    sourceNote: '据《周易正义》（阮刻十三经注疏本）整理，选段属公开领域。',
  },
  {
    id: 'meihua-yishu', title: '梅花易数', author: '宋·邵雍', era: '宋代', arts: ['meihua'],
    summary: '以「观梅」起卦而得名，主张心动即占、万物皆数，凡时间、字数、方位、声音皆可起卦，重体用生克而轻程式。',
    background: '邵雍（1011-1077）为北宋易学大家，其《皇极经世》推演宇宙元会运世。梅花易数以简易灵动著称，是象数易学的通俗化结晶。',
    chapters: [
      { title: '观梅占', summary: '起卦法式总说' },
      { title: '体用论', summary: '体用生克总纲' },
      { title: '万物皆数', summary: '取数起卦诸法' },
    ],
    excerpts: [
      {
        title: '观梅占（节选）', source: '《梅花易数·观梅占》',
        original: '辰年十二月十七日申时，康节先生偶观梅，见二雀争枝坠地。先生曰：不动不占，不因事不占。今二雀争枝坠地，怪也。因占之。',
        translation: '辰年十二月十七日申时，邵康节先生偶然观赏梅花，看见两只喜鹊争枝而坠地。先生说：没有变动不占，没有事因不占。如今二雀争枝坠地，是异常之象。于是起卦占断。',
        annotation: '此即「梅花易数」得名之由来，也是「不动不占」原则的出处。',
      },
    ],
    sourceNote: '据《梅花易数》通行本整理，选段属公开领域。',
  },
  {
    id: 'zengshan-buyi', title: '增删卜易', author: '清·野鹤老人', era: '清代', arts: ['liuyao'],
    summary: '六爻实践派的扛鼎之作，以大量实战卦例说明断卦方法，删繁就简，重验不重玄，为六爻研习者的必读经典。',
    background: '野鹤老人积数十年占验之功，著成此书。书以「增删」为名，即增补卦例、删去虚文的取义。',
    chapters: [
      { title: '摇钱起卦', summary: '铜钱起卦法' },
      { title: '装卦', summary: '纳甲装卦法' },
      { title: '用神', summary: '取用神之要' },
    ],
    excerpts: [
      {
        title: '用神（节选）', source: '《增删卜易·用神章》',
        original: '用神者，卦之体也。凡占必先寻用神，用神不现，须寻伏神。',
        translation: '用神是卦的根本。凡占卜必须先确定用神；用神在卦中不出现时，就要寻找伏神。',
        annotation: '取用神是六爻断卦的第一步：问财取财爻、问官取官鬼爻等。',
      },
    ],
    sourceNote: '据《增删卜易》通行本整理，选段属公开领域。',
  },
  {
    id: 'bushe-zhengzong', title: '卜筮正宗', author: '清·王洪绪', era: '清代', arts: ['liuyao'],
    summary: '六爻入门经典，系统讲述装卦、世应、六亲六神、日月动变诸法，条理清晰，为启蒙之善本。',
    background: '王洪绪精于医卜，其书以「正宗」自任，旨在正本清源，纠正当时卜书的芜杂。',
    chapters: [
      { title: '启蒙节要', summary: '干支五行基础' },
      { title: '八宫诸卦', summary: '六十四卦宫属' },
      { title: '世应六亲', summary: '世应安法' },
    ],
    excerpts: [
      {
        title: '论用神（节选）', source: '《卜筮正宗》',
        original: '凡占必以用神为主，有根有气则吉，无根无气则凶。',
        translation: '凡占卜必须以用神为主，用神有根基有生气的就吉，没有根基没有生气的就凶。',
        annotation: '「有根」指用神得月日生扶，「有气」指不被刑冲克害。',
      },
    ],
    sourceNote: '据《卜筮正宗》通行本整理，选段属公开领域。',
  },
  {
    id: 'liuren-daquan', title: '六壬大全', author: '明·郭御青校订', era: '明代', arts: ['liuren'],
    summary: '大六壬集大成之作，汇录起课、九宗门、十二天将、毕法赋等要义，为壬学研习的渊薮。',
    background: '大六壬与奇门遁甲、太乙神数并称「三式」，六壬最验人事，号称「人事之王」。《六壬大全》明季辑成，流传最广。',
    chapters: [
      { title: '起课法', summary: '月将加时立天地盘' },
      { title: '九宗门', summary: '九种取传之法' },
      { title: '毕法赋', summary: '百法断课总诀' },
    ],
    excerpts: [
      {
        title: '起课（节选）', source: '《六壬大全·起课》',
        original: '课传既定，先视四课之生克，次观三传之发用。天地盘加临，日月星为纬。',
        translation: '课式与三传确定之后，先看四课的生克关系，再看三传的起用。天地盘相互加临，如同日月星辰织成的经纬。',
        annotation: '四课三传为大六壬断课的主体结构，此句点明课传推演的次序。',
      },
    ],
    sourceNote: '据《四库全书》本整理，选段属公开领域。',
  },
  {
    id: 'yanpo-diaosou', title: '烟波钓叟歌', author: '托名唐·李靖', era: '唐宋间', arts: ['qimen'],
    summary: '奇门遁甲的纲领歌诀，以韵文总述九宫、八门、九星、八神与三奇六仪之用法，为奇门研习者必背之篇。',
    background: '歌诀托名李靖所作，实为唐宋间奇门术士的总结之作。「烟波钓叟」即隐者之号，歌诀以口耳相传的方式保存了奇门体系。',
    chapters: [
      { title: '总纲', summary: '奇门源流与九宫' },
      { title: '三奇六仪', summary: '乙丙丁与六仪布局' },
      { title: '八门九星', summary: '八门九星八神' },
    ],
    excerpts: [
      {
        title: '总纲（节选）', source: '《烟波钓叟歌》',
        original: '阴阳顺逆妙难穷，二至还乡一九宫。若能了达阴阳理，天地都来一掌中。',
        translation: '阴阳顺逆的奥妙难以穷尽，冬至夏至阴阳遁的起局回归于一九之宫。若能通达阴阳之理，天地变化尽可运于掌中。',
        annotation: '「二至」指冬至、夏至，为阴阳遁起局的分界；「一九宫」指阳遁从一宫起、阴遁从九宫起的布法。',
      },
    ],
    sourceNote: '据《奇门遁甲统宗》所载歌诀整理，选段属公开领域。',
  },
];

export const classicById = (id: string) => CLASSICS.find(c => c.id === id);