// 中国省市区县 → 经纬度数据集（首期精简版：34 省级 + 主要城市 + 城区默认值）
// 坐标取各市市中心/政府驻地近似值，数据来源：公开地理数据整理

export interface District {
  name: string;
  lng?: number;
  lat?: number;
}

export interface City {
  name: string;
  lng: number;
  lat: number;
  districts?: District[];
}

export interface Province {
  name: string;
  cities: City[];
}

export const REGIONS: Province[] = [
  { name: '北京', cities: [
    { name: '北京市', lng: 116.407, lat: 39.904, districts: [{ name: '东城区' }, { name: '西城区' }, { name: '朝阳区' }, { name: '海淀区' }, { name: '丰台区' }, { name: '通州区' }] },
  ] },
  { name: '上海', cities: [
    { name: '上海市', lng: 121.474, lat: 31.230, districts: [{ name: '黄浦区' }, { name: '徐汇区' }, { name: '静安区' }, { name: '浦东新区' }, { name: '闵行区' }, { name: '嘉定区' }] },
  ] },
  { name: '天津', cities: [
    { name: '天津市', lng: 117.201, lat: 39.084, districts: [{ name: '和平区' }, { name: '河西区' }, { name: '南开区' }, { name: '滨海新区' }] },
  ] },
  { name: '重庆', cities: [
    { name: '重庆市', lng: 106.551, lat: 29.563, districts: [{ name: '渝中区' }, { name: '江北区' }, { name: '沙坪坝区' }, { name: '南岸区' }, { name: '九龙坡区' }] },
  ] },
  { name: '河北', cities: [
    { name: '石家庄', lng: 114.515, lat: 38.042 }, { name: '唐山', lng: 118.180, lat: 39.630 },
    { name: '保定', lng: 115.464, lat: 38.874 }, { name: '邯郸', lng: 114.539, lat: 36.625 },
    { name: '秦皇岛', lng: 119.600, lat: 39.935 }, { name: '廊坊', lng: 116.684, lat: 39.538 },
  ] },
  { name: '山西', cities: [
    { name: '太原', lng: 112.549, lat: 37.857 }, { name: '大同', lng: 113.300, lat: 40.076 },
    { name: '临汾', lng: 111.519, lat: 36.088 }, { name: '运城', lng: 111.007, lat: 35.026 },
    { name: '晋中', lng: 112.753, lat: 37.687 },
  ] },
  { name: '内蒙古', cities: [
    { name: '呼和浩特', lng: 111.749, lat: 40.842 }, { name: '包头', lng: 109.840, lat: 40.657 },
    { name: '赤峰', lng: 118.887, lat: 42.257 }, { name: '鄂尔多斯', lng: 109.781, lat: 39.608 },
    { name: '呼伦贝尔', lng: 119.766, lat: 49.212 },
  ] },
  { name: '辽宁', cities: [
    { name: '沈阳', lng: 123.431, lat: 41.805 }, { name: '大连', lng: 121.615, lat: 38.914 },
    { name: '鞍山', lng: 122.994, lat: 41.108 }, { name: '锦州', lng: 121.127, lat: 41.095 },
    { name: '丹东', lng: 124.354, lat: 40.000 },
  ] },
  { name: '吉林', cities: [
    { name: '长春', lng: 125.323, lat: 43.817 }, { name: '吉林', lng: 126.550, lat: 43.838 },
    { name: '延边', lng: 129.509, lat: 42.891 }, { name: '四平', lng: 124.350, lat: 43.167 },
  ] },
  { name: '黑龙江', cities: [
    { name: '哈尔滨', lng: 126.535, lat: 45.803 }, { name: '齐齐哈尔', lng: 123.918, lat: 47.354 },
    { name: '大庆', lng: 125.103, lat: 46.589 }, { name: '牡丹江', lng: 129.633, lat: 44.551 },
    { name: '佳木斯', lng: 130.319, lat: 46.799 },
  ] },
  { name: '江苏', cities: [
    { name: '南京', lng: 118.797, lat: 32.060 }, { name: '苏州', lng: 120.585, lat: 31.299 },
    { name: '无锡', lng: 120.312, lat: 31.491 }, { name: '徐州', lng: 117.284, lat: 34.205 },
    { name: '常州', lng: 119.974, lat: 31.811 }, { name: '南通', lng: 120.895, lat: 31.980 },
    { name: '扬州', lng: 119.413, lat: 32.394 }, { name: '盐城', lng: 120.163, lat: 33.348 },
  ] },
  { name: '浙江', cities: [
    { name: '杭州', lng: 120.155, lat: 30.274 }, { name: '宁波', lng: 121.550, lat: 29.874 },
    { name: '温州', lng: 120.699, lat: 27.994 }, { name: '金华', lng: 119.647, lat: 29.079 },
    { name: '绍兴', lng: 120.580, lat: 30.030 }, { name: '嘉兴', lng: 120.758, lat: 30.746 },
    { name: '台州', lng: 121.421, lat: 28.656 },
  ] },
  { name: '安徽', cities: [
    { name: '合肥', lng: 117.227, lat: 31.821 }, { name: '芜湖', lng: 118.433, lat: 31.353 },
    { name: '安庆', lng: 117.063, lat: 30.543 }, { name: '蚌埠', lng: 117.389, lat: 32.916 },
    { name: '黄山', lng: 118.338, lat: 29.714 },
  ] },
  { name: '福建', cities: [
    { name: '福州', lng: 119.296, lat: 26.074 }, { name: '厦门', lng: 118.089, lat: 24.480 },
    { name: '泉州', lng: 118.676, lat: 24.874 }, { name: '漳州', lng: 117.647, lat: 24.513 },
    { name: '莆田', lng: 119.008, lat: 25.454 },
  ] },
  { name: '江西', cities: [
    { name: '南昌', lng: 115.858, lat: 28.683 }, { name: '赣州', lng: 114.935, lat: 25.831 },
    { name: '九江', lng: 116.002, lat: 29.705 }, { name: '景德镇', lng: 117.178, lat: 29.269 },
  ] },
  { name: '山东', cities: [
    { name: '济南', lng: 117.120, lat: 36.651 }, { name: '青岛', lng: 120.383, lat: 36.067 },
    { name: '烟台', lng: 121.448, lat: 37.464 }, { name: '潍坊', lng: 119.162, lat: 36.717 },
    { name: '临沂', lng: 118.356, lat: 35.105 }, { name: '济宁', lng: 116.587, lat: 35.415 },
  ] },
  { name: '河南', cities: [
    { name: '郑州', lng: 113.625, lat: 34.746 }, { name: '洛阳', lng: 112.454, lat: 34.620 },
    { name: '开封', lng: 114.307, lat: 34.797 }, { name: '南阳', lng: 112.528, lat: 32.990 },
    { name: '安阳', lng: 114.392, lat: 36.098 }, { name: '信阳', lng: 114.091, lat: 32.147 },
  ] },
  { name: '湖北', cities: [
    { name: '武汉', lng: 114.305, lat: 30.593 }, { name: '宜昌', lng: 111.287, lat: 30.692 },
    { name: '襄阳', lng: 112.122, lat: 32.009 }, { name: '荆州', lng: 112.241, lat: 30.325 },
    { name: '黄石', lng: 115.038, lat: 30.201 },
  ] },
  { name: '湖南', cities: [
    { name: '长沙', lng: 112.939, lat: 28.228 }, { name: '株洲', lng: 113.134, lat: 27.828 },
    { name: '衡阳', lng: 112.572, lat: 26.893 }, { name: '岳阳', lng: 113.129, lat: 29.357 },
    { name: '张家界', lng: 110.479, lat: 29.117 },
  ] },
  { name: '广东', cities: [
    { name: '广州', lng: 113.264, lat: 23.129, districts: [{ name: '越秀区' }, { name: '天河区' }, { name: '海珠区' }, { name: '番禺区' }] },
    { name: '深圳', lng: 114.058, lat: 22.543, districts: [{ name: '福田区' }, { name: '南山区' }, { name: '罗湖区' }, { name: '宝安区' }] },
    { name: '佛山', lng: 113.122, lat: 23.021 }, { name: '珠海', lng: 113.577, lat: 22.271 },
    { name: '汕头', lng: 116.682, lat: 23.354 }, { name: '东莞', lng: 113.752, lat: 23.021 },
    { name: '中山', lng: 113.392, lat: 22.517 }, { name: '惠州', lng: 114.416, lat: 23.111 },
  ] },
  { name: '广西', cities: [
    { name: '南宁', lng: 108.366, lat: 22.817 }, { name: '桂林', lng: 110.290, lat: 25.274 },
    { name: '柳州', lng: 109.416, lat: 24.326 }, { name: '北海', lng: 109.120, lat: 21.481 },
  ] },
  { name: '海南', cities: [
    { name: '海口', lng: 110.199, lat: 20.044 }, { name: '三亚', lng: 109.512, lat: 18.253 },
    { name: '儋州', lng: 109.581, lat: 19.521 },
  ] },
  { name: '四川', cities: [
    { name: '成都', lng: 104.066, lat: 30.573, districts: [{ name: '锦江区' }, { name: '青羊区' }, { name: '武侯区' }, { name: '成华区' }] },
    { name: '绵阳', lng: 104.680, lat: 31.467 }, { name: '乐山', lng: 103.765, lat: 29.552 },
    { name: '宜宾', lng: 104.642, lat: 28.752 }, { name: '南充', lng: 106.083, lat: 30.795 },
    { name: '攀枝花', lng: 101.718, lat: 26.582 },
  ] },
  { name: '贵州', cities: [
    { name: '贵阳', lng: 106.630, lat: 26.647 }, { name: '遵义', lng: 106.927, lat: 27.726 },
    { name: '六盘水', lng: 104.830, lat: 26.592 }, { name: '安顺', lng: 105.947, lat: 26.253 },
  ] },
  { name: '云南', cities: [
    { name: '昆明', lng: 102.833, lat: 24.880 }, { name: '大理', lng: 100.267, lat: 25.606 },
    { name: '丽江', lng: 100.230, lat: 26.856 }, { name: '曲靖', lng: 103.796, lat: 25.490 },
    { name: '西双版纳', lng: 100.797, lat: 22.001 },
  ] },
  { name: '西藏', cities: [
    { name: '拉萨', lng: 91.140, lat: 29.646 }, { name: '日喀则', lng: 88.880, lat: 29.267 },
  ] },
  { name: '陕西', cities: [
    { name: '西安', lng: 108.940, lat: 34.341, districts: [{ name: '碑林区' }, { name: '雁塔区' }, { name: '未央区' }, { name: '长安区' }] },
    { name: '宝鸡', lng: 107.238, lat: 34.362 }, { name: '咸阳', lng: 108.709, lat: 34.330 },
    { name: '延安', lng: 109.490, lat: 36.585 }, { name: '汉中', lng: 107.023, lat: 33.067 },
  ] },
  { name: '甘肃', cities: [
    { name: '兰州', lng: 103.834, lat: 36.061 }, { name: '天水', lng: 105.725, lat: 34.581 },
    { name: '酒泉', lng: 98.494, lat: 39.732 }, { name: '敦煌', lng: 94.662, lat: 40.142 },
  ] },
  { name: '青海', cities: [
    { name: '西宁', lng: 101.778, lat: 36.617 }, { name: '格尔木', lng: 94.928, lat: 36.406 },
  ] },
  { name: '宁夏', cities: [
    { name: '银川', lng: 106.231, lat: 38.487 }, { name: '吴忠', lng: 106.198, lat: 37.997 },
    { name: '中卫', lng: 105.190, lat: 37.500 },
  ] },
  { name: '新疆', cities: [
    { name: '乌鲁木齐', lng: 87.617, lat: 43.793 }, { name: '喀什', lng: 75.990, lat: 39.470 },
    { name: '伊犁', lng: 81.324, lat: 43.917 }, { name: '克拉玛依', lng: 84.889, lat: 45.580 },
    { name: '吐鲁番', lng: 89.190, lat: 42.951 },
  ] },
  { name: '香港', cities: [
    { name: '香港', lng: 114.169, lat: 22.320 },
  ] },
  { name: '澳门', cities: [
    { name: '澳门', lng: 113.544, lat: 22.198 },
  ] },
  { name: '台湾', cities: [
    { name: '台北', lng: 121.565, lat: 25.033 }, { name: '高雄', lng: 120.312, lat: 22.621 },
    { name: '台中', lng: 120.684, lat: 24.138 },
  ] },
];

// 解析选择结果 → GeoLocation（未选时返回 null）
export interface GeoSelection {
  province: string;
  city: string;
  district: string;
  lng: number;
  lat: number;
}

export function resolveLocation(province: string, city: string, district: string): GeoSelection | null {
  const p = REGIONS.find(r => r.name === province);
  if (!p) return null;
  const c = p.cities.find(c2 => c2.name === city);
  if (!c) return null;
  const d = c.districts?.find(d2 => d2.name === district);
  return {
    province: p.name,
    city: c.name,
    district: d ? d.name : '城区',
    lng: d && d.lng !== undefined ? d.lng : c.lng,
    lat: d && d.lat !== undefined ? d.lat : c.lat,
  };
}
// ============ 扩充城市（第二批，补全主要地级市） ============
const EXTRA_CITIES: Record<string, { name: string; lng: number; lat: number }[]> = {
  河北: [{ name: '邢台', lng: 114.505, lat: 37.070 }, { name: '张家口', lng: 114.886, lat: 40.824 }, { name: '承德', lng: 117.962, lat: 40.951 }, { name: '沧州', lng: 116.838, lat: 38.304 }, { name: '衡水', lng: 115.670, lat: 37.738 }],
  山西: [{ name: '阳泉', lng: 113.580, lat: 37.856 }, { name: '长治', lng: 113.116, lat: 36.195 }, { name: '晋城', lng: 112.851, lat: 35.491 }, { name: '朔州', lng: 112.433, lat: 39.331 }, { name: '忻州', lng: 112.734, lat: 38.417 }],
  内蒙古: [{ name: '通辽', lng: 122.244, lat: 43.653 }, { name: '巴彦淖尔', lng: 107.388, lat: 40.743 }, { name: '乌兰察布', lng: 113.132, lat: 40.995 }, { name: '兴安盟', lng: 122.070, lat: 46.082 }],
  辽宁: [{ name: '抚顺', lng: 123.957, lat: 41.881 }, { name: '本溪', lng: 123.766, lat: 41.294 }, { name: '营口', lng: 122.235, lat: 40.667 }, { name: '辽阳', lng: 123.237, lat: 41.269 }, { name: '盘锦', lng: 122.071, lat: 41.124 }],
  吉林: [{ name: '辽源', lng: 125.143, lat: 42.887 }, { name: '通化', lng: 125.940, lat: 41.728 }, { name: '白山', lng: 126.424, lat: 41.940 }, { name: '松原', lng: 124.825, lat: 45.142 }],
  黑龙江: [{ name: '鸡西', lng: 130.969, lat: 45.295 }, { name: '鹤岗', lng: 130.298, lat: 47.349 }, { name: '双鸭山', lng: 131.159, lat: 46.646 }, { name: '伊春', lng: 128.841, lat: 47.727 }, { name: '黑河', lng: 127.528, lat: 50.245 }],
  江苏: [{ name: '连云港', lng: 119.221, lat: 34.600 }, { name: '淮安', lng: 119.015, lat: 33.610 }, { name: '镇江', lng: 119.425, lat: 32.187 }, { name: '泰州', lng: 119.926, lat: 32.456 }, { name: '宿迁', lng: 118.275, lat: 33.963 }],
  浙江: [{ name: '湖州', lng: 120.086, lat: 30.893 }, { name: '衢州', lng: 118.874, lat: 28.935 }, { name: '丽水', lng: 119.922, lat: 28.467 }],
  安徽: [{ name: '淮南', lng: 117.018, lat: 32.647 }, { name: '马鞍山', lng: 118.506, lat: 31.670 }, { name: '淮北', lng: 116.798, lat: 33.955 }, { name: '铜陵', lng: 117.812, lat: 30.945 }, { name: '阜阳', lng: 115.814, lat: 32.890 }],
  福建: [{ name: '三明', lng: 117.638, lat: 26.263 }, { name: '南平', lng: 118.178, lat: 26.642 }, { name: '龙岩', lng: 117.017, lat: 25.075 }, { name: '宁德', lng: 119.548, lat: 26.666 }],
  江西: [{ name: '萍乡', lng: 113.854, lat: 27.622 }, { name: '新余', lng: 114.917, lat: 27.817 }, { name: '鹰潭', lng: 117.069, lat: 28.260 }, { name: '吉安', lng: 114.993, lat: 27.114 }, { name: '宜春', lng: 114.416, lat: 27.815 }, { name: '抚州', lng: 116.358, lat: 27.984 }, { name: '上饶', lng: 117.943, lat: 28.455 }],
  山东: [{ name: '淄博', lng: 118.055, lat: 36.813 }, { name: '枣庄', lng: 117.321, lat: 34.810 }, { name: '东营', lng: 118.675, lat: 37.434 }, { name: '泰安', lng: 117.087, lat: 36.191 }, { name: '威海', lng: 122.120, lat: 37.513 }, { name: '日照', lng: 119.527, lat: 35.416 }, { name: '德州', lng: 116.359, lat: 37.435 }, { name: '聊城', lng: 115.985, lat: 36.456 }, { name: '滨州', lng: 117.971, lat: 37.381 }, { name: '菏泽', lng: 115.480, lat: 35.234 }],
  河南: [{ name: '平顶山', lng: 113.192, lat: 33.766 }, { name: '鹤壁', lng: 114.297, lat: 35.748 }, { name: '新乡', lng: 113.927, lat: 35.303 }, { name: '焦作', lng: 113.242, lat: 35.216 }, { name: '濮阳', lng: 115.030, lat: 35.762 }, { name: '许昌', lng: 113.852, lat: 34.037 }, { name: '漯河', lng: 114.016, lat: 33.580 }, { name: '三门峡', lng: 111.200, lat: 34.772 }, { name: '商丘', lng: 115.656, lat: 34.414 }, { name: '周口', lng: 114.697, lat: 33.626 }, { name: '驻马店', lng: 114.022, lat: 33.011 }],
  湖北: [{ name: '十堰', lng: 110.798, lat: 32.629 }, { name: '荆门', lng: 112.199, lat: 31.035 }, { name: '孝感', lng: 113.916, lat: 30.924 }, { name: '黄冈', lng: 114.872, lat: 30.453 }, { name: '咸宁', lng: 114.322, lat: 29.841 }, { name: '随州', lng: 113.383, lat: 31.690 }, { name: '恩施', lng: 109.487, lat: 30.272 }],
  湖南: [{ name: '湘潭', lng: 112.944, lat: 27.830 }, { name: '邵阳', lng: 111.467, lat: 27.239 }, { name: '常德', lng: 111.698, lat: 29.032 }, { name: '益阳', lng: 112.355, lat: 28.554 }, { name: '郴州', lng: 113.014, lat: 25.771 }, { name: '永州', lng: 111.613, lat: 26.420 }, { name: '怀化', lng: 110.001, lat: 27.570 }, { name: '娄底', lng: 111.994, lat: 27.697 }],
  广东: [{ name: '韶关', lng: 113.597, lat: 24.810 }, { name: '江门', lng: 113.082, lat: 22.579 }, { name: '湛江', lng: 110.365, lat: 21.271 }, { name: '茂名', lng: 110.925, lat: 21.663 }, { name: '肇庆', lng: 112.473, lat: 23.047 }, { name: '梅州', lng: 116.122, lat: 24.288 }, { name: '汕尾', lng: 115.375, lat: 22.786 }, { name: '河源', lng: 114.700, lat: 23.743 }, { name: '阳江', lng: 111.982, lat: 21.857 }, { name: '清远', lng: 113.056, lat: 23.681 }, { name: '潮州', lng: 116.623, lat: 23.657 }, { name: '揭阳', lng: 116.373, lat: 23.550 }, { name: '云浮', lng: 112.045, lat: 22.915 }],
  广西: [{ name: '梧州', lng: 111.279, lat: 23.476 }, { name: '防城港', lng: 108.354, lat: 21.687 }, { name: '钦州', lng: 108.654, lat: 21.980 }, { name: '贵港', lng: 109.598, lat: 23.111 }, { name: '玉林', lng: 110.181, lat: 22.654 }, { name: '百色', lng: 106.618, lat: 23.902 }, { name: '贺州', lng: 111.566, lat: 24.403 }, { name: '河池', lng: 108.085, lat: 24.692 }, { name: '来宾', lng: 109.222, lat: 23.751 }, { name: '崇左', lng: 107.365, lat: 22.376 }],
  四川: [{ name: '自贡', lng: 104.778, lat: 29.339 }, { name: '攀枝花', lng: 101.718, lat: 26.582 }, { name: '泸州', lng: 105.442, lat: 28.872 }, { name: '德阳', lng: 104.398, lat: 31.127 }, { name: '广元', lng: 105.843, lat: 32.435 }, { name: '遂宁', lng: 105.571, lat: 30.513 }, { name: '内江', lng: 105.058, lat: 29.580 }, { name: '眉山', lng: 103.848, lat: 30.075 }, { name: '达州', lng: 107.468, lat: 31.209 }, { name: '雅安', lng: 103.042, lat: 30.010 }, { name: '凉山', lng: 102.267, lat: 27.881 }],
  贵州: [{ name: '毕节', lng: 105.285, lat: 27.302 }, { name: '铜仁', lng: 109.190, lat: 27.718 }, { name: '黔南', lng: 107.517, lat: 26.258 }, { name: '黔东南', lng: 107.977, lat: 26.583 }, { name: '黔西南', lng: 104.897, lat: 25.088 }],
  云南: [{ name: '玉溪', lng: 102.546, lat: 24.351 }, { name: '保山', lng: 99.162, lat: 25.112 }, { name: '昭通', lng: 103.717, lat: 27.338 }, { name: '普洱', lng: 100.966, lat: 22.825 }, { name: '临沧', lng: 100.089, lat: 23.878 }, { name: '红河', lng: 103.384, lat: 23.366 }, { name: '楚雄', lng: 101.546, lat: 25.032 }],
  陕西: [{ name: '铜川', lng: 108.945, lat: 34.897 }, { name: '渭南', lng: 109.510, lat: 34.500 }, { name: '榆林', lng: 109.735, lat: 38.285 }, { name: '安康', lng: 109.029, lat: 32.684 }, { name: '商洛', lng: 109.941, lat: 33.870 }],
  甘肃: [{ name: '嘉峪关', lng: 98.290, lat: 39.773 }, { name: '金昌', lng: 102.188, lat: 38.514 }, { name: '白银', lng: 104.139, lat: 36.545 }, { name: '武威', lng: 102.638, lat: 37.928 }, { name: '张掖', lng: 100.450, lat: 38.925 }, { name: '平凉', lng: 106.665, lat: 35.542 }, { name: '庆阳', lng: 107.643, lat: 35.710 }],
  新疆: [{ name: '哈密', lng: 93.515, lat: 42.833 }, { name: '昌吉', lng: 87.308, lat: 44.011 }, { name: '巴音郭楞', lng: 86.150, lat: 41.768 }, { name: '阿克苏', lng: 80.260, lat: 41.171 }, { name: '和田', lng: 79.925, lat: 37.110 }],
  西藏: [{ name: '林芝', lng: 94.362, lat: 29.649 }, { name: '山南', lng: 91.772, lat: 29.237 }, { name: '那曲', lng: 92.053, lat: 31.476 }],
};

// 合并扩充城市到 REGIONS
Object.keys(EXTRA_CITIES).forEach(pname => {
  const p = REGIONS.find(r => r.name === pname);
  if (p) {
    EXTRA_CITIES[pname].forEach(c => {
      if (!p.cities.some(ex => ex.name === c.name)) p.cities.push(c);
    });
  }
});
// ============ 重点城市区县扩充（第三批：主城区坐标） ============
const EXTRA_DISTRICTS: Record<string, { name: string; lng: number; lat: number }[]> = {
  杭州: [{ name: '上城区', lng: 120.170, lat: 30.243 }, { name: '拱墅区', lng: 120.142, lat: 30.319 }, { name: '西湖区', lng: 120.130, lat: 30.259 }, { name: '滨江区', lng: 120.212, lat: 30.209 }, { name: '萧山区', lng: 120.264, lat: 30.183 }],
  南京: [{ name: '玄武区', lng: 118.798, lat: 32.048 }, { name: '秦淮区', lng: 118.795, lat: 32.011 }, { name: '鼓楼区', lng: 118.770, lat: 32.066 }, { name: '建邺区', lng: 118.732, lat: 32.004 }, { name: '江宁区', lng: 118.840, lat: 31.953 }],
  武汉: [{ name: '江岸区', lng: 114.309, lat: 30.600 }, { name: '江汉区', lng: 114.271, lat: 30.601 }, { name: '武昌区', lng: 114.316, lat: 30.554 }, { name: '洪山区', lng: 114.344, lat: 30.500 }, { name: '汉阳区', lng: 114.218, lat: 30.554 }],
  长沙: [{ name: '芙蓉区', lng: 113.032, lat: 28.185 }, { name: '天心区', lng: 112.990, lat: 28.113 }, { name: '岳麓区', lng: 112.931, lat: 28.235 }, { name: '开福区', lng: 112.985, lat: 28.256 }],
  郑州: [{ name: '中原区', lng: 113.613, lat: 34.748 }, { name: '二七区', lng: 113.640, lat: 34.724 }, { name: '金水区', lng: 113.661, lat: 34.800 }, { name: '管城回族区', lng: 113.677, lat: 34.754 }],
  青岛: [{ name: '市南区', lng: 120.412, lat: 36.075 }, { name: '市北区', lng: 120.375, lat: 36.087 }, { name: '崂山区', lng: 120.469, lat: 36.107 }, { name: '李沧区', lng: 120.433, lat: 36.145 }],
  沈阳: [{ name: '和平区', lng: 123.395, lat: 41.790 }, { name: '沈河区', lng: 123.459, lat: 41.796 }, { name: '大东区', lng: 123.470, lat: 41.805 }, { name: '皇姑区', lng: 123.442, lat: 41.820 }],
  大连: [{ name: '中山区', lng: 121.645, lat: 38.918 }, { name: '西岗区', lng: 121.612, lat: 38.915 }, { name: '沙河口区', lng: 121.594, lat: 38.905 }, { name: '甘井子区', lng: 121.525, lat: 38.953 }],
  厦门: [{ name: '思明区', lng: 118.082, lat: 24.445 }, { name: '湖里区', lng: 118.147, lat: 24.513 }, { name: '集美区', lng: 118.097, lat: 24.576 }, { name: '海沧区', lng: 118.033, lat: 24.485 }],
  福州: [{ name: '鼓楼区', lng: 119.304, lat: 26.082 }, { name: '台江区', lng: 119.314, lat: 26.058 }, { name: '仓山区', lng: 119.274, lat: 26.047 }, { name: '晋安区', lng: 119.328, lat: 26.082 }],
  昆明: [{ name: '五华区', lng: 102.707, lat: 25.044 }, { name: '盘龙区', lng: 102.752, lat: 25.116 }, { name: '官渡区', lng: 102.749, lat: 24.950 }, { name: '西山区', lng: 102.665, lat: 25.038 }],
  南宁: [{ name: '兴宁区', lng: 108.369, lat: 22.854 }, { name: '青秀区', lng: 108.494, lat: 22.785 }, { name: '江南区', lng: 108.273, lat: 22.781 }, { name: '西乡塘区', lng: 108.313, lat: 22.833 }],
  哈尔滨: [{ name: '道里区', lng: 126.617, lat: 45.756 }, { name: '南岗区', lng: 126.669, lat: 45.760 }, { name: '道外区', lng: 126.649, lat: 45.791 }, { name: '香坊区', lng: 126.663, lat: 45.708 }],
  长春: [{ name: '南关区', lng: 125.350, lat: 43.864 }, { name: '宽城区', lng: 125.326, lat: 43.943 }, { name: '朝阳区', lng: 125.288, lat: 43.833 }, { name: '二道区', lng: 125.374, lat: 43.865 }],
  济南: [{ name: '历下区', lng: 117.077, lat: 36.666 }, { name: '市中区', lng: 116.997, lat: 36.651 }, { name: '槐荫区', lng: 116.901, lat: 36.651 }, { name: '天桥区', lng: 116.987, lat: 36.678 }],
  合肥: [{ name: '瑶海区', lng: 117.309, lat: 31.858 }, { name: '庐阳区', lng: 117.265, lat: 31.879 }, { name: '蜀山区', lng: 117.261, lat: 31.851 }, { name: '包河区', lng: 117.310, lat: 31.793 }],
  南昌: [{ name: '东湖区', lng: 115.899, lat: 28.685 }, { name: '西湖区', lng: 115.877, lat: 28.657 }, { name: '青云谱区', lng: 115.926, lat: 28.621 }, { name: '青山湖区', lng: 115.962, lat: 28.682 }],
  太原: [{ name: '小店区', lng: 112.564, lat: 37.736 }, { name: '迎泽区', lng: 112.563, lat: 37.863 }, { name: '杏花岭区', lng: 112.571, lat: 37.887 }, { name: '尖草坪区', lng: 112.487, lat: 37.940 }],
  石家庄: [{ name: '长安区', lng: 114.539, lat: 38.047 }, { name: '桥西区', lng: 114.461, lat: 38.004 }, { name: '新华区', lng: 114.463, lat: 38.051 }, { name: '裕华区', lng: 114.531, lat: 38.006 }],
  兰州: [{ name: '城关区', lng: 103.825, lat: 36.057 }, { name: '七里河区', lng: 103.786, lat: 36.066 }, { name: '西固区', lng: 103.628, lat: 36.088 }, { name: '安宁区', lng: 103.719, lat: 36.104 }],
  贵阳: [{ name: '南明区', lng: 106.714, lat: 26.568 }, { name: '云岩区', lng: 106.725, lat: 26.604 }, { name: '花溪区', lng: 106.670, lat: 26.410 }, { name: '乌当区', lng: 106.751, lat: 26.630 }],
  乌鲁木齐: [{ name: '天山区', lng: 87.631, lat: 43.794 }, { name: '沙依巴克区', lng: 87.598, lat: 43.801 }, { name: '新市区', lng: 87.574, lat: 43.843 }, { name: '水磨沟区', lng: 87.642, lat: 43.832 }],
  海口: [{ name: '秀英区', lng: 110.293, lat: 20.007 }, { name: '龙华区', lng: 110.328, lat: 20.031 }, { name: '琼山区', lng: 110.354, lat: 20.003 }, { name: '美兰区', lng: 110.366, lat: 20.029 }],
  三亚: [{ name: '吉阳区', lng: 109.578, lat: 18.281 }, { name: '天涯区', lng: 109.452, lat: 18.300 }, { name: '崖州区', lng: 109.172, lat: 18.357 }, { name: '海棠区', lng: 109.753, lat: 18.400 }],
  银川: [{ name: '兴庆区', lng: 106.289, lat: 38.474 }, { name: '西夏区', lng: 106.162, lat: 38.492 }, { name: '金凤区', lng: 106.243, lat: 38.473 }],
  西宁: [{ name: '城东区', lng: 101.803, lat: 36.599 }, { name: '城中区', lng: 101.784, lat: 36.621 }, { name: '城西区', lng: 101.766, lat: 36.628 }, { name: '城北区', lng: 101.766, lat: 36.650 }],
};

// 合并到城市 districts
Object.keys(EXTRA_DISTRICTS).forEach(cname => {
  REGIONS.forEach(p => {
    const c = p.cities.find(x => x.name === cname);
    if (c) {
      const existing = c.districts || [];
      c.districts = [...existing, ...EXTRA_DISTRICTS[cname].map(d => ({ name: d.name, lng: d.lng, lat: d.lat }))];
    }
  });
});