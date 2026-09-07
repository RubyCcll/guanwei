#!/usr/bin/env python3
# Swiss Ephemeris 对照桥（astrology 引擎交叉验证用）
# 用法：echo '<json>' | python3 swe_ephemeris.py
# 输入：{"cases":[{"y":..,"m":..,"d":..,"hour":..,"min":..,"lng":..,"lat":..}]}
# 输出：{"results":[{"planets":{"太阳":..,...},"asc":..,"mc":..}]}
# 引擎口径：输入为北京时间(UTC+8)；黄经为回归黄道 of-date（视位置）
import json, sys
import swisseph as swe


def _sun_lng(jd):
    res, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_MOSEPH)
    return res[0] % 360.0

def _phase(jd, deg):
    return ((_sun_lng(jd) - deg + 540.0) % 360.0) - 180.0

def _crossing_jd(y, mo, d, deg):
    """太阳黄经到达 deg° 的时刻（UTC JD），bracket：近似日±3.5 天"""
    jd0 = swe.julday(y, mo, d, 0.0, swe.GREG_CAL) - 3.5
    jd1 = jd0 + 7.0
    # 6 小时步定位过宫区间（f 由正变负）
    prev = jd0
    f0 = _phase(prev, deg)
    t = jd0
    step = 0.25
    while t < jd1:
        ft = _phase(t, deg)
        if f0 < 0 <= ft:  # 由负变正 = 越过 deg
            jd0, jd1 = prev, t
            break
        f0 = ft
        prev = t
        t += step
    # 二分至亚秒
    for _ in range(50):
        mid = (jd0 + jd1) / 2.0
        if _phase(mid, deg) < 0:
            jd0 = mid
        else:
            jd1 = mid
    return (jd0 + jd1) / 2.0

def _fmt_beijing(jd):
    y, mo, d, h = swe.revjul(jd + 8.0 / 24.0, swe.GREG_CAL)
    hh = int(h)
    mmf = (h - hh) * 60.0
    mm = int(mmf)
    ss = int(round((mmf - mm) * 60.0))
    if ss >= 60:
        ss -= 60
        mm += 1
    if mm >= 60:
        mm -= 60
        hh += 1
    return '%04d-%02d-%02d %02d:%02d:%02d' % (y, mo, d, hh, mm, ss)

def _mode_jieqi(req):
    out = []
    for tg in req['targets']:
        mo, dd = [int(x) for x in tg['approx'].split('-')]
        jd = _crossing_jd(tg['y'], mo, dd, tg['deg'])
        out.append({'name': tg['name'], 'y': tg['y'], 'time': _fmt_beijing(jd), 'jd': jd})
    return {'results': out}


CASES_JSON = sys.stdin.read()
req = json.loads(CASES_JSON)
PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']
PIDS = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
CN = ['太阳', '月亮', '水星', '金星', '火星', '木星', '土星']

_MODE = req.get('mode')
if _MODE == 'jieqi':
    print(json.dumps(_mode_jieqi(req), ensure_ascii=False))
    sys.exit(0)
out = []
for c in req['cases']:
    jd = swe.julday(c['y'], c['m'], c['d'], c['hour'] + c['min'] / 60.0 - 8, swe.GREG_CAL)
    planets = {}
    for pid, cn in zip(PIDS, CN):
        res, _ = swe.calc_ut(jd, pid, swe.FLG_MOSEPH | swe.FLG_SPEED)
        planets[cn] = res[0] % 360.0
    # 上升/中天（P=Placidus；Asc/MC 与宫位制无关，可直接对照整宫制引擎）
    try:
        cusps, ascmc = swe.houses_ex(jd, c['lat'], c['lng'], b'P')
    except Exception:
        # Moshier 历表回退整度黄道
        cusps, ascmc = swe.houses_ex(jd, c['lat'], c['lng'], b'W')
    out.append({
        'planets': planets,
        'asc': ascmc[0] % 360.0,
        'mc': ascmc[1] % 360.0,
        'jd': jd,
    })
print(json.dumps({'results': out}, ensure_ascii=False))
