import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  WastewaterRecord, 
  WaterQualityLimits, 
  SummaryStats 
} from "../types";
import { 
  DEFAULT_LIMITS, 
  parseWastewaterCsv, 
  calculateSummaryStats 
} from "../lib/dataParser";
import { RAW_CSV_DATA } from "../data/rawCsvData";
import CsvUploader from "./CsvUploader";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from "recharts";
import { 
  Droplet, 
  Flame, 
  Activity, 
  Sliders, 
  Filter, 
  Layers, 
  AlertTriangle, 
  Download, 
  CheckCircle, 
  Search, 
  HelpCircle,
  TrendingUp,
  RefreshCw
} from "lucide-react";

export default function Dashboard() {
  // 1. 상태 정의 (데이터, 필터, 수질 한계 기준)
  const [rawText, setRawText] = useState<string>(RAW_CSV_DATA);
  const [dataName, setDataName] = useState<string>("내장 기본 데이터 (부산지역 하수처리장)");
  
  // 수질 법정 오염 한계 기준치
  const [limits, setLimits] = useState<WaterQualityLimits>(DEFAULT_LIMITS);
  
  // 파싱된 레코드 목록
  const records = useMemo(() => {
    return parseWastewaterCsv(rawText, limits);
  }, [rawText, limits]);

  // 존재하는 사업소 목록 자동 추출 및 정렬
  const facilities = useMemo(() => {
    const list = Array.from(new Set(records.map(r => r.facility)));
    return list.sort();
  }, [records]);

  // 공간 필터: 선택된 사업소 목록 (초기에는 모두 선택)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const activeFacilities = useMemo(() => {
    return selectedFacilities.length > 0 ? selectedFacilities : facilities;
  }, [selectedFacilities, facilities]);

  // 3번 지표 기준값 슬라이더 필터 (이 값 이하인 데이터만 선별)
  // T-N, T-P에 대해 사용자가 기준치 이하인 우수 등급 레코드를 선별 관찰하기 위함
  const [tnFilterVal, setTnFilterVal] = useState<number>(30); // 0 ~ 40 범위 내
  const [tpFilterVal, setTpFilterVal] = useState<number>(4.0); // 0.0 ~ 5.0 범위 내
  
  // 오염 한계선 필터 토글 스위치 ("수질 오염 기준치 초과일만 필터")
  const [showOnlyExcess, setShowOnlyExcess] = useState<boolean>(false);

  // 검색어 및 테이블 페이징 & 정렬
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<keyof WastewaterRecord>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // 차트 시각화 대상 수질 지표 탭
  const [activeChartTab, setActiveChartTab] = useState<"flow" | "quality">("flow");
  const [qualityChartMetric, setQualityChartQuality] = useState<"tn" | "tp" | "bod">("tn");

  // 2. 다차원 필터링 연산
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // (1) 공간 필터
      const isFacilityMatch = activeFacilities.includes(r.facility);
      
      // (2) 수소이온농도/BOD 등 기본 검색
      const isSearchMatch = r.facility.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.date.includes(searchTerm);

      // (3) 3번 지표 기준값 슬라이더 만족 여부 (이하인 허용수 이하 수질 기록 선별)
      const isWaterQualitySafe = r.tn <= tnFilterVal && r.tp <= tpFilterVal;

      // (4) 오염 한계선 초과일만 필터링 모드
      const isExcessFilterMatch = showOnlyExcess ? r.isExcess === true : true;

      return isFacilityMatch && isSearchMatch && isWaterQualitySafe && isExcessFilterMatch;
    });
  }, [records, activeFacilities, searchTerm, tnFilterVal, tpFilterVal, showOnlyExcess]);

  // 3. 통계 연산
  const stats = useMemo(() => {
    return calculateSummaryStats(filteredRecords);
  }, [filteredRecords]);

  // 테이블 정렬 처리
  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });
    return sorted;
  }, [filteredRecords, sortField, sortDirection]);

  // 페이징된 데이터
  const pagedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRecords, currentPage]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

  // 4. 이벤트 핸들러
  const handleFacilityToggle = (facility: string) => {
    setSelectedFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility) 
        : [...prev, facility]
    );
    setCurrentPage(1);
  };

  const selectAllFacilities = () => {
    setSelectedFacilities([]);
    setCurrentPage(1);
  };

  const handleSort = (field: keyof WastewaterRecord) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleCsvLoaded = (text: string, name: string) => {
    setRawText(text);
    setDataName(name);
    setSelectedFacilities([]);
    setCurrentPage(1);
  };

  const handleResetData = () => {
    setRawText(RAW_CSV_DATA);
    setDataName("내장 기본 데이터 (부산지역 하수처리장)");
    setTnFilterVal(30);
    setTpFilterVal(4.0);
    setLimits(DEFAULT_LIMITS);
    setSelectedFacilities([]);
    setShowOnlyExcess(false);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleDownloadCsv = () => {
    const headers = "사업소,날짜,하수량(m3/일),BOD(mg/L),COD(mg/L),부유물질(SS),총질소(T-N),총인(T-P),pH,초과지표\n";
    const rows = sortedRecords.map(r => 
      `"${r.facility}","${r.date}",${r.flowRate},${r.bod},${r.cod},${r.ss},${r.tn},${r.tp},${r.ph},"${r.excessIndicators?.join("|") || ""}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `하수질_선별_리포트_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 차트용 시계열 변동성 데이터 생성 (최신 30일 또는 적정 수량 가공)
  const chartData = useMemo(() => {
    interface DateGroup {
      date: string;
      totalFlow: number;
      tn: number;
      tp: number;
      bod: number;
      count: number;
      [key: string]: any;
    }

    // 날짜별로 그룹화 및 누적
    const dateMap: { [date: string]: DateGroup } = {};
    
    // 분석 대상 기간의 데이터 정제
    filteredRecords.forEach(r => {
      const d = r.date;
      if (!dateMap[d]) {
        dateMap[d] = { date: d, totalFlow: 0, tn: 0, tp: 0, bod: 0, count: 0 };
      }
      dateMap[d].totalFlow += r.flowRate;
      dateMap[d][r.facility] = r.flowRate;
      dateMap[d].tn += r.tn;
      dateMap[d].tp += r.tp;
      dateMap[d].bod += r.bod;
      dateMap[d].count += 1;
    });

    const list = Object.values(dateMap).map(item => {
      const avgFactor = item.count || 1;
      return {
        ...item,
        tn: Math.round((item.tn / avgFactor) * 100) / 100,
        tp: Math.round((item.tp / avgFactor) * 1000) / 1000,
        bod: Math.round((item.bod / avgFactor) * 100) / 100,
      };
    });

    // 날짜 오름차순 정렬 (차트 렌더링용)
    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(-45); // 최근 45개 트렌드 표시
  }, [filteredRecords]);

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] font-sans text-slate-800 overflow-hidden" id="main-dashboard-container">
      {/* [1] Sleek Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full" id="sidebar-filters-panel">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">WaterFlow <span className="text-blue-600">HQ</span></h1>
          <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">하수 처리 통합 관제</p>
        </div>
        
        <div className="flex-1 p-6 space-y-8 overflow-y-auto" id="sidebar-scrollable-content">
          {/* A. 데이터 소스 관리 */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" /> [1] 데이터 소스 관리
            </h2>
            <CsvUploader onDataLoaded={handleCsvLoaded} />
          </div>

          {/* B. 공간 필터 (사업소) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">[2] 공간 필터</h2>
              <button 
                onClick={selectAllFacilities}
                className="text-[11px] text-blue-600 font-bold hover:underline"
                id="select-all-facilities-btn"
              >
                {selectedFacilities.length > 0 ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1" id="facility-checkbox-list">
              {facilities.map(facility => {
                const isChecked = selectedFacilities.includes(facility) || selectedFacilities.length === 0;
                return (
                  <label 
                    key={facility} 
                    className="flex items-center space-x-3 cursor-pointer group"
                    id={`label-facility-${facility}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFacilities.includes(facility)}
                      onChange={() => handleFacilityToggle(facility)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      id={`checkbox-facility-${facility}`}
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                      {facility}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({records.filter(r => r.facility === facility).length}일)
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* C. 지표 기준값 필터 (슬라이더) */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">[3] 지표 기준값 필터</h2>
            <div className="space-y-6">
              {/* T-N Slider */}
              <div id="tn-slider-box">
                <div className="flex justify-between text-xs mb-2" id="tn-slider-header">
                  <span className="font-bold">총질소 (T-N)</span>
                  <span className="text-blue-600 font-mono">{tnFilterVal} mg/L 이하</span>
                </div>
                <input 
                  type="range" 
                  min="3"
                  max="40"
                  step="1"
                  value={tnFilterVal}
                  onChange={(e) => {
                    setTnFilterVal(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                  id="tn-range-input"
                />
              </div>

              {/* T-P Slider */}
              <div id="tp-slider-box">
                <div className="flex justify-between text-xs mb-2" id="tp-slider-header">
                  <span className="font-bold">총인 (T-P)</span>
                  <span className="text-blue-600 font-mono">{tpFilterVal.toFixed(2)} mg/L 이하</span>
                </div>
                <input 
                  type="range" 
                  min="0.01"
                  max="5.0"
                  step="0.05"
                  value={tpFilterVal}
                  onChange={(e) => {
                    setTpFilterVal(parseFloat(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                  id="tp-range-input"
                />
              </div>
            </div>
          </div>

          {/* D. 오염 한계선 관리 */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">오염 한계선 관리</h2>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100" id="excess-switch-wrap">
              <span className="text-xs font-bold leading-tight">
                수질 오염 기준치<br/>초과일만 필터
              </span>
              <button 
                type="button"
                onClick={() => {
                  setShowOnlyExcess(prev => !prev);
                  setCurrentPage(1);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showOnlyExcess ? "bg-red-500" : "bg-slate-200"
                }`}
                id="excess-toggle-switch"
                role="switch"
                aria-checked={showOnlyExcess}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  showOnlyExcess ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* E. Sidebar Footer */}
        <div className="p-6 text-center border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 font-mono">v2.4.0-build.82</p>
        </div>
      </aside>

      {/* [2] Main Dashboard Frame */}
      <main className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto h-full" id="right-dashboard-main">
        {/* Header */}
        <header className="flex items-end justify-between flex-wrap gap-4" id="dashboard-header">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">실시간 하수 수질 대시보드</h2>
            <p className="text-sm text-slate-500">{dataName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">현재 수집 상태</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-bold text-slate-700">정상 가동 중</span>
              </div>
            </div>
            <button
              onClick={handleResetData}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors"
              id="reset-dashboard-btn"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> 대시보드 리셋
            </button>
          </div>
        </header>

        {/* KPI Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6" id="kpi-cards-grid">
          {/* Card 1: Total flow */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between" id="kpi-flow-card">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">평균 하수 방류량</span>
            <div className="text-3xl font-bold mt-1 tracking-tight text-slate-800">
              {Math.round(stats.totalFlow / Math.max(filteredRecords.length, 1)).toLocaleString()} <span className="text-sm text-slate-400 font-normal">m³/d</span>
            </div>
            <div className="text-xs text-green-600 mt-2 font-semibold font-mono">
              ↑ 2.4% vs 전일
            </div>
          </div>

          {/* Card 2: Avg BOD */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between" id="kpi-bod-card">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">BOD 일일 평균</span>
            <div className="text-3xl font-bold mt-1 tracking-tight text-slate-800">
              {stats.averageBod} <span className="text-sm text-slate-400 font-normal">mg/L</span>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              법정 기준치: {limits.bod}
            </div>
          </div>

          {/* Card 3: Avg TN */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between" id="kpi-tn-card">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">T-N 일일 평균</span>
            <div className="text-3xl font-bold mt-1 text-blue-600 tracking-tight">
              {stats.averageTn} <span className="text-sm text-slate-400 font-normal">mg/L</span>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              법정 기준치: {limits.tn}
            </div>
          </div>

          {/* Card 4: Danger/Excess */}
          <div className={`${stats.excessRecordsCount > 0 ? "bg-red-50 border-red-100" : "bg-white border-slate-200"} p-5 rounded-2xl border shadow-sm flex flex-col justify-between`} id="kpi-excess-card">
            <span className={`text-[10px] font-bold ${stats.excessRecordsCount > 0 ? "text-red-400" : "text-slate-400"} uppercase tracking-tighter`}>기준치 초과 감지</span>
            <div className={`text-3xl font-bold mt-1 ${stats.excessRecordsCount > 0 ? "text-red-600" : "text-slate-800"}`}>
              {stats.excessRecordsCount.toString().padStart(2, '0')} <span className="text-sm font-normal">건</span>
            </div>
            <div className={`text-xs mt-2 ${stats.excessRecordsCount > 0 ? "text-red-600 font-semibold" : "text-slate-400"}`}>
              {stats.excessRecordsCount > 0 ? "위험 수준 알림 활성화" : "정상 수치 유지"}
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4" id="visual-chart-box">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100" id="chart-controls">
            {/* Chart type select */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg self-start" id="chart-tab-wrap" role="tablist">
              <button
                role="tab"
                aria-selected={activeChartTab === "flow"}
                onClick={() => setActiveChartTab("flow")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeChartTab === "flow" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
                id="tab-btn-flow"
              >
                하수량 변동성 실시간 관찰
              </button>
              <button
                role="tab"
                aria-selected={activeChartTab === "quality"}
                onClick={() => setActiveChartTab("quality")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeChartTab === "quality" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
                id="tab-btn-quality"
              >
                수질 오염 지표 추이
              </button>
            </div>

            {/* Metric Select Buttons */}
            {activeChartTab === "quality" && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg" id="quality-selector-wrap">
                <button
                  onClick={() => setQualityChartQuality("tn")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    qualityChartMetric === "tn" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  id="metric-btn-tn"
                >
                  총질소 (T-N)
                </button>
                <button
                  onClick={() => setQualityChartQuality("tp")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    qualityChartMetric === "tp" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  id="metric-btn-tp"
                >
                  총인 (T-P)
                </button>
                <button
                  onClick={() => setQualityChartQuality("bod")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    qualityChartMetric === "bod" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  id="metric-btn-bod"
                >
                  BOD 수치
                </button>
              </div>
            )}
          </div>

          {/* Actual Chart zone */}
          <div className="w-full h-80 min-h-[320px]" id="chart-render-zone">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl" id="no-chart-data-alert">
                <AlertTriangle className="w-8 h-8 text-slate-300" />
                <span className="text-sm font-medium">분석 조건에 최적화된 차트 데이터가 존재하지 않습니다.</span>
              </div>
            ) : activeChartTab === "flow" ? (
              <ResponsiveContainer width="100%" height="100%" id="flow-resp-container">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(v) => v.slice(5)} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    labelStyle={{ color: "#334155", fontWeight: "bold" }}
                  />
                  <Area 
                    type="monotone" 
                    name="총 하수량(m³)" 
                    dataKey="totalFlow" 
                    stroke="#2563eb" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorFlow)" 
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%" id="quality-resp-container">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(v) => v.slice(5)} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                  />
                  <Tooltip 
                    contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  
                  {qualityChartMetric === "tn" && (
                    <>
                      <Line 
                        type="monotone" 
                        name="평균 총질소(T-N) mg/L" 
                        dataKey="tn" 
                        stroke="#2563eb" 
                        strokeWidth={2} 
                        dot={{ r: 2 }}
                      />
                      <ReferenceLine 
                        y={limits.tn} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        label={{ value: `법정 기준치 (${limits.tn} mg/L)`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                      />
                    </>
                  )}

                  {qualityChartMetric === "tp" && (
                    <>
                      <Line 
                        type="monotone" 
                        name="평균 총인(T-P) mg/L" 
                        dataKey="tp" 
                        stroke="#2563eb" 
                        strokeWidth={2} 
                        dot={{ r: 2 }}
                      />
                      <ReferenceLine 
                        y={limits.tp} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        label={{ value: `법정 기준치 (${limits.tp} mg/L)`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                      />
                    </>
                  )}

                  {qualityChartMetric === "bod" && (
                    <>
                      <Line 
                        type="monotone" 
                        name="평균 BOD mg/L" 
                        dataKey="bod" 
                        stroke="#2563eb" 
                        strokeWidth={2} 
                        dot={{ r: 2 }}
                      />
                      <ReferenceLine 
                        y={limits.bod} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        label={{ value: `법정 기준치 (${limits.bod} mg/L)`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Table & Filtering List Section */}
        <section className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden" id="records-list-wrapper">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4" id="table-util-bar">
            <div>
              <h3 className="text-sm font-bold text-slate-900" id="table-title">일별 수질 측정 데이터 (초과일 집중 모니터링)</h3>
              <p className="text-xs text-slate-400 mt-0.5" id="table-subtitle">공간 필터 및 지표 검색 범위 내 ({sortedRecords.length}일 검색됨)</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search input field matching general styling */}
              <div className="relative w-52" id="table-search-box">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="사업소명 또는 날짜 검색"
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 bg-white shadow-xs"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  id="record-search-input"
                />
              </div>
              <button 
                onClick={handleDownloadCsv}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                id="csv-download-button"
              >
                <Download className="w-3.5 h-3.5" /> CSV 다운로드
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto" id="table-parent">
            <table className="w-full text-left border-collapse" id="records-table">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                <tr className="h-10">
                  <th className="px-6 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("date")} id="th-date">날짜</th>
                  <th className="px-6 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("facility")} id="th-facility">사업소</th>
                  <th className="px-6 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort("flowRate")} id="th-flow">방류량 (m³)</th>
                  <th className="px-6 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort("bod")} id="th-bod">BOD (mg/L)</th>
                  <th className="px-6 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort("tn")} id="th-tn">T-N (mg/L)</th>
                  <th className="px-6 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort("tp")} id="th-tp">T-P (mg/L)</th>
                  <th className="px-6 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort("ph")} id="th-ph">pH</th>
                  <th className="px-6" id="th-status">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[13px]" id="table-body">
                {pagedRecords.length === 0 ? (
                  <tr id="no-records-row">
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-sans text-xs" id="no-records-td">
                      선택 조건에 해당하는 측정 기록이 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((r) => {
                    const hasLossLimit = r.isExcess;
                    return (
                      <tr 
                        key={r.id} 
                        className={`transition-colors ${hasLossLimit ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-slate-50"}`}
                        id={`tr-record-${r.id}`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900" id={`td-date-${r.id}`}>{r.date}</td>
                        <td className="px-6 font-sans font-medium text-slate-700" id={`td-fac-${r.id}`}>{r.facility}</td>
                        <td className="px-6 text-right text-slate-600" id={`td-flow-${r.id}`}>{r.flowRate.toLocaleString()}</td>
                        <td className="px-6 text-right text-slate-600" id={`td-bod-${r.id}`}>{r.bod}</td>
                        <td className={`px-6 text-right ${r.tn > limits.tn ? "text-red-650 font-bold" : "text-slate-600"}`} id={`td-tn-${r.id}`}>{r.tn}</td>
                        <td className={`px-6 text-right ${r.tp > limits.tp ? "text-red-650 font-bold" : "text-slate-600"}`} id={`td-tp-${r.id}`}>{r.tp}</td>
                        <td className="px-6 text-right text-slate-600" id={`td-ph-${r.id}`}>{r.ph}</td>
                        <td className="px-6" id={`td-status-${r.id}`}>
                          {hasLossLimit ? (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-md tracking-tight uppercase" id={`span-bad-${r.id}`}>
                              Danger
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 uppercase" id={`span-good-${r.id}`}>
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination panel */}
          {sortedRecords.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 p-5 bg-slate-50/20" id="pagination-controls">
              <span className="text-xs text-slate-400 font-semibold" id="page-indicator-text">
                총 {sortedRecords.length}일 중 {currentPage} / {totalPages || 1} 페이지
              </span>

              <div className="flex gap-1.5" id="pagination-btn-group">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 text-slate-600 border border-slate-200 font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                  id="prev-page-btn"
                >
                  이전
                </button>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 text-slate-600 border border-slate-200 font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                  id="next-page-btn"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
