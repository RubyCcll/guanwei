export function getCurrentZodiac(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '白羊座';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '双子座';
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '狮子座';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '处女座';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蝎座';
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
  return '双鱼座';
}

export function getMoonPhase(): string {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  const day = now.getDate();
  
  let c, e, jd, b;
  if (month < 3) {
    year--;
    month += 12;
  }
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = parseInt(jd.toString());
  jd -= b;
  b = Math.round(jd * 8);
  
  const phases = ['新月', '峨眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
  return phases[b] || '新月';
}

export function getDailyFortune(): string {
  const fortunes = [
    '今日星辰排列显示，你的直觉格外敏锐。信任内心的声音，它将指引你走向正确的方向。适合进行冥想和内省。',
    '太阳与木星形成吉相位，带来扩张与成长的机会。勇敢地迈出舒适区，宇宙正在支持你冒险。',
    '月亮进入你的情感宫位，情绪波动较大。与亲友共度时光能为你带来安慰，避免做出冲动的决定。',
    '水星逆行结束，沟通与计划开始顺畅。搁置的项目可以重新启动，旧友可能带来好消息。',
    '金星与火星的相位激发你的魅力与行动力。这是追求爱情或事业目标的理想时机，展现你的热情。',
    '土星的影响提醒你脚踏实地。虽然进展缓慢，但每一步都坚实可靠。耐心是你的盟友。',
    '天王星的突变能量可能带来意外的转折。保持开放和灵活，惊喜往往伪装成挑战出现。',
    '海王星的迷雾笼罩，理想与现实之间的界限模糊。用艺术和创造力来表达你难以言说的感受。',
    '冥王星的转化力量正在运作。放下旧有的模式，允许深刻的蜕变发生。死亡与重生是同一枚硬币的两面。',
    '群星汇聚在你的事业宫，职业发展的机会显现。你的努力终于被看见，晋升或认可可能到来。',
    '今日适合学习新知识和技能。心智格外清晰，阅读、写作和研究都能获得丰硕成果。',
    '财务方面需要谨慎。避免冲动消费，回顾你的预算和理财计划。稳健的投资策略胜过冒险投机。',
  ];
  
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  return fortunes[seed % fortunes.length];
}
