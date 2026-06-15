export interface WastewaterRecord {
  id: string;
  facility: string; // 사업소명
  date: string; // 날짜 (YYYY-MM-DD)
  flowRate: number; // 하수량 (m³/일)
  bod: number; // 생화학적 산소 요구량 (mg/L)
  cod: number; // 화학적 산소 요구량 (mg/L)
  ss: number; // 부유물질 (mg/L)
  tn: number; // 총질소 T-N (mg/L)
  tp: number; // 총인 T-P (mg/L)
  ph: number; // 수소이온농도 pH
  isExcess?: boolean; // 수질 요염 기준치 초과 여부
  excessIndicators?: string[]; // 초과된 구체적 지표 목록
}

export interface WaterQualityLimits {
  bod: number; // 법정 한계 BOD (디폴트: 10)
  cod: number; // 법정 한계 COD (디폴트: 40)
  ss: number; // 법정 한계 부유물질 SS (디폴트: 10)
  tn: number; // 법정 한계 총질소 T-N (디폴트: 20)
  tp: number; // 법정 한계 총인 T-P (디폴트: 0.5 또는 1.5)
  phMin: number; // 법정 한계 최소 pH (디폴트: 5.8)
  phMax: number; // 법정 한계 최대 pH (디폴트: 8.6)
}

export interface SummaryStats {
  totalFlow: number;
  averageFlow: number;
  averageBod: number;
  averageCod: number;
  averageSs: number;
  averageTn: number;
  averageTp: number;
  averagePh: number;
  totalRecordsCount: number;
  excessRecordsCount: number;
  excessRatio: number;
}
