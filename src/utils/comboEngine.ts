import type { ComboResult } from '@/types';

export function generateXiaoLiuRen(): ComboResult {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  
  const liuShen = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'];
  const index = (month + day + hour) % 6;
  const result = liuShen[index];
  
  const meanings: Record<string, string> = {
    '大安': '身不动时，五行属木，颜色青色，方位东方。临青龙，谋事主一、五、七。有静止、心安、吉祥之含义。',
    '留连': '卒未归时，五行属水，颜色黑色，方位北方。临玄武，谋事主二、八、十。有暗昧不明、延迟、纠缠之含义。',
    '速喜': '人即至时，五行属火，颜色红色，方位南方。临朱雀，谋事主三、六、九。有快速、喜庆、吉利之含义。',
    '赤口': '官事凶时，五行属金，颜色白色，方位西方。临白虎，谋事主四、七、十。有不吉、惊恐、凶险之含义。',
    '小吉': '人来喜时，五行属木，颜色绿色，方位东方。临六合，谋事主一、五、七。有和合、吉利之含义。',
    '空亡': '音信稀时，五行属土，颜色黄色，方位中央。临勾陈，谋事主三、六、九。有虚无、失望、不利之含义。',
  };
  
  return {
    method: 'xiaoliuren',
    methodName: '小六壬',
    result,
    detail: meanings[result],
    relationToTarot: `小六壬${result}与当前塔罗能量呼应。${result === '大安' || result === '速喜' || result === '小吉' ? '东方术数显示吉兆，与塔罗中正位牌的能量共振，宜积极行动。' : '术数提示需要谨慎，与塔罗中逆位牌的警示一致，建议内观等待时机。'}`,
  };
}

export function generateLiuYao(): ComboResult {
  const now = new Date();
  const yaoResults = [];
  
  // 简化六爻起卦：基于时间随机生成六爻
  const seed = now.getTime();
  for (let i = 0; i < 6; i++) {
    const rand = (seed + i * 997) % 100;
    if (rand < 25) yaoResults.push('老阴');
    else if (rand < 50) yaoResults.push('少阴');
    else if (rand < 75) yaoResults.push('少阳');
    else yaoResults.push('老阳');
  }
  
  const hexagramNames: Record<string, string> = {
    '666666': '坤为地', '666665': '地雷复', '666656': '地水师', '666655': '地泽临',
    '665666': '雷地豫', '665665': '震为雷', '665656': '雷水解', '665655': '雷泽归妹',
    '656666': '水地比', '656665': '水雷屯', '656656': '坎为水', '656655': '水泽节',
    '655666': '泽地萃', '655665': '泽雷随', '655656': '泽水困', '655655': '兑为泽',
  };
  
  const guaKey = yaoResults.map(y => y.includes('阴') ? '6' : '5').join('');
  const hexagram = hexagramNames[guaKey] || `卦象${guaKey}`;
  
  return {
    method: 'liuyao',
    methodName: '六爻',
    result: hexagram,
    detail: `六爻卦象：${yaoResults.join('、')}。${hexagram}卦象揭示了当前事态的深层变化。动爻显示变化的契机，静爻代表稳定的基础。`,
    relationToTarot: '六爻卦象与塔罗牌阵形成阴阳互补。卦中的动爻对应塔罗中的转变牌，提示变革的时机已经成熟。',
  };
}

export function generateMeiHua(): ComboResult {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  const shangGua = (hour + 1) % 8;
  const xiaGua = (minute + 1) % 8;
  
  const trigrams = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  const shang = trigrams[shangGua];
  const xia = trigrams[xiaGua];
  
  const hexagramName = `${shang}${xia}`;
  
  return {
    method: 'meihua',
    methodName: '梅花易数',
    result: hexagramName,
    detail: `以当前时间${hour}时${minute}分起卦，得上卦${shang}、下卦${xia}，合成${hexagramName}卦。体用之分揭示了主客关系，卦气旺衰指示时机吉凶。`,
    relationToTarot: '梅花易数的体用关系与塔罗牌阵的主牌-辅牌结构相呼应。体卦代表问卜者自身状态，用卦对应塔罗中代表外部环境的牌位。',
  };
}

export function generateDaLiuRen(): ComboResult {
  const now = new Date();
  const hour = now.getHours();
  
  const tianPan = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const diPan = ['贵', '蛇', '雀', '合', '勾', '龙', '空', '虎', '常', '玄', '阴', '后'];
  
  const tian = tianPan[hour % 12];
  const di = diPan[hour % 12];
  
  return {
    method: 'daliuren',
    methodName: '大六壬',
    result: `${tian}加${di}`,
    detail: `大六壬以当前时辰起课，天盘${tian}加地盘${di}。四课三传揭示了事件的来龙去脉，三传（初传、中传、末传）指示事态发展的始、中、终三个阶段。`,
    relationToTarot: '大六壬的四课三传与塔罗牌阵的时间线（过去-现在-未来）形成精密对应。初传对应过去牌位，末传呼应未来趋势。',
  };
}

export function generateQiMen(): ComboResult {
  const now = new Date();
  const hour = now.getHours();
  
  const baMen = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];
  const jiuXing = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'];
  
  const men = baMen[hour % 8];
  const xing = jiuXing[hour % 9];
  
  return {
    method: 'qimen',
    methodName: '奇门遁甲',
    result: `${xing}星临${men}`,
    detail: `奇门遁甲以当前时辰定局，${xing}星临${men}。奇门盘中的天盘九星、地盘八卦、人盘八门与神盘八神共同构建了时空模型，揭示了趋吉避凶的最佳时机与方位。`,
    relationToTarot: '奇门遁甲的时空模型为塔罗解读增添了方位与时间的维度。塔罗揭示心灵的图景，奇门提供行动的指南，两者结合形成完整的决策系统。',
  };
}

export function generateComboResult(method: string): ComboResult {
  switch (method) {
    case 'xiaoliuren': return generateXiaoLiuRen();
    case 'liuyao': return generateLiuYao();
    case 'meihua': return generateMeiHua();
    case 'daliuren': return generateDaLiuRen();
    case 'qimen': return generateQiMen();
    default: return generateXiaoLiuRen();
  }
}
