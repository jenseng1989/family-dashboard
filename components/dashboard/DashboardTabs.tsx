"use client";

import {
  CloudSun,
  Compass,
  Home,
  HousePlus,
  ChevronDown, ChevronRight, Menu, X, Lightbulb, Tv, Shield, Zap, Thermometer, BookOpen, ShoppingCart, GraduationCap, Sparkles, Globe2, Telescope, UserRound, Baby,
  LoaderCircle,
  MapPin,
  Plane,
  Settings,
  Users,
} from "lucide-react";

import dynamic from "next/dynamic";
import Link from "next/link";
import Hemstatus from "@/components/dashboard/Hemstatus";

import {
  type ReactNode,
  useEffect,
  useState,
  useRef,
} from "react";

import type {
  AppSettings,
  AppTabId,
} from "@/lib/app-settings-client";

import {
  trackDashboardEvent,
} from "@/lib/dashboard-analytics";

type TabId = AppTabId;

function trackTabView(tabId: TabId): void {
  void trackDashboardEvent("tab_view", tabId);
}

type DashboardTabsProps = {
  initialSettings: AppSettings;
  startContent: Record<"everyday" | "home" | "shopping" | "school", ReactNode>;
  weatherContent: ReactNode;
};

type TabButton = {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: ReactNode;
};

function TabLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-[220px] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-slate-400">
        <LoaderCircle
          size={21}
          className="animate-spin text-blue-300"
        />

        <span className="text-sm font-semibold">
          Laddar {label}…
        </span>
      </div>
    </div>
  );
}

/*
 * Dessa tre flikar innehåller klientkompatibla
 * moduler och kan därför lazy-loadas säkert.
 *
 * Väder skickas in som server-renderat
 * innehåll från Dashboard.tsx eftersom
 * WeatherWidget är en async Server Component.
 */

const FamilyDashboardTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/FamilyDashboardTab"
    ),
  {
    loading: () => (
      <TabLoading label="familjen" />
    ),
  }
);

const GothenburgDashboardTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/GothenburgDashboardTab"
    ),
  {
    loading: () => (
      <TabLoading label="Göteborg" />
    ),
  }
);

const ExploreDashboardTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/ExploreDashboardTab"
    ),
  {
    loading: () => (
      <TabLoading label="Utforska" />
    ),
  }
);

const ResorDashboard = dynamic(
  () => import("@/components/dashboard/resor/ResorDashboard"),
  { loading: () => <TabLoading label="Resor" /> }
);

const SmarthemDashboard = dynamic(
  () => import("@/components/smarthem-preview/SmarthemPreview"),
  { loading: () => <TabLoading label="Smarthem" /> }
);


type Group = "home" | "family" | "fun" | "hemmet3d";
type ChildId = string;
const childMenus: Record<Group, {id: string; label: string; icon: ReactNode}[]> = {
  home: [
    {id:"home",label:"Planering",icon:<Home size={16}/>},
    {id:"shopping",label:"Ekonomi",icon:<ShoppingCart size={16}/>},
    {id:"school",label:"Skola",icon:<GraduationCap size={16}/>},
  ],
  family: [
    {id:"Gemensam",label:"Gemensam",icon:<Users size={16}/>},
    {id:"Jens",label:"Jens",icon:<UserRound size={16}/>},
    {id:"Lenita",label:"Lenita",icon:<UserRound size={16}/>},
    {id:"Signe",label:"Signe",icon:<Baby size={16}/>},
  ],
  fun: [
    {id:"overview",label:"Översikt",icon:<Compass size={16}/>},
    {id:"space",label:"Rymden",icon:<Telescope size={16}/>},
    {id:"earth",label:"Jorden",icon:<Globe2 size={16}/>},
  ],
  hemmet3d: [
    {id:"Översikt",label:"Översikt",icon:<Home size={16}/>},
    {id:"Belysning",label:"Belysning",icon:<Lightbulb size={16}/>},
    {id:"Media",label:"Media",icon:<Tv size={16}/>},
    {id:"Övervakning",label:"Övervakning",icon:<Shield size={16}/>},
    {id:"El",label:"El",icon:<Zap size={16}/>},
    {id:"Klimat",label:"Klimat",icon:<Thermometer size={16}/>},
    {id:"Administration",label:"Administration",icon:<Settings size={16}/>},
  ],
};
const topMenus: {id:TabId; label:string; icon:ReactNode}[] = [
  {id:"today",label:"Start",icon:<Home size={19}/>},
  {id:"home",label:"Hemmet",icon:<HousePlus size={19}/>},
  {id:"weather",label:"Väder",icon:<CloudSun size={19}/>},
  {id:"family",label:"Familjen",icon:<Users size={19}/>},
  {id:"gothenburg",label:"Göteborg",icon:<MapPin size={19}/>},
  {id:"fun",label:"Utforska",icon:<Compass size={19}/>},
  {id:"hemmet3d",label:"Smarthem",icon:<HousePlus size={19}/>},
  {id:"resor",label:"Resor",icon:<Plane size={19}/>},
];
const isGroup = (id:TabId): id is Group => id === "home" || id === "family" || id === "fun" || id === "hemmet3d";

export default function DashboardTabs({initialSettings,startContent,weatherContent}:DashboardTabsProps) {
  const initialTab:TabId = (initialSettings.defaultTab === "resor" && !initialSettings.showResorTab) ||
    (initialSettings.defaultTab === "hemmet3d" && !initialSettings.showHemmet3DTab) ? "today" : initialSettings.defaultTab;
  const [activeTab,setActiveTab] = useState<TabId>(initialTab);
  const [childByGroup,setChildByGroup] = useState<Record<Group,string>>({home:"home",family:"Gemensam",fun:"overview",hemmet3d:"Översikt"});
  const [expanded,setExpanded] = useState<Record<Group,boolean>>({home:initialTab === "home",family:initialTab === "family",fun:initialTab === "fun",hemmet3d:initialTab === "hemmet3d"});
  const [mobileOpen,setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  useEffect(() => {
    document.title = initialSettings.dashboardName;
    void trackDashboardEvent("dashboard_view");
    trackTabView(initialTab);
  },[initialSettings.dashboardName,initialTab]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileSidebarRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Stäng meny"]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
      if (event.key === "Tab" && mobileSidebarRef.current) {
        const focusable = Array.from(mobileSidebarRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);
  const navigate = (tab:TabId,child?:string) => {
    if(tab !== activeTab) trackTabView(tab);
    setActiveTab(tab);
    if(child && isGroup(tab) && childMenus[tab].some(item => item.id === child)) {
      setChildByGroup(prev => ({...prev, [tab]: child}));
    }
    if(isGroup(tab)) setExpanded(prev => ({...prev, [tab]: true}));
    setMobileOpen(false);
  };
  useEffect(() => {
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: string; child?: string; anchor?: string }>).detail;
      if (!detail?.tab) return;
      const target = topMenus.find(item => item.id === detail.tab);
      if (!target) return;
      if (target.id === "resor" && !initialSettings.showResorTab) return;
      if (target.id === "hemmet3d" && !initialSettings.showHemmet3DTab) return;
      setPendingAnchor(detail.anchor ?? null);
      navigate(target.id, detail.child);
    };
    window.addEventListener("family-dashboard:navigate", onNavigate);
    return () => window.removeEventListener("family-dashboard:navigate", onNavigate);
  });
  useEffect(() => {
    if (!pendingAnchor) return;
    let frame = 0;
    let attempts = 0;
    const findAndScroll = () => {
      const element = document.getElementById(pendingAnchor);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setPendingAnchor(null);
        return;
      }
      if (++attempts < 90) frame = window.requestAnimationFrame(findAndScroll);
      else setPendingAnchor(null);
    };
    frame = window.requestAnimationFrame(findAndScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, childByGroup, pendingAnchor]);
  const content = ():ReactNode => {
    switch(activeTab) {
      case "today": return <>{startContent.everyday}{initialSettings.showHemmet3DTab && <Hemstatus />}</>;
      case "home": return startContent[childByGroup.home as "home" | "shopping" | "school"] ?? startContent.home;
      case "weather": return weatherContent;
      case "family": return <FamilyDashboardTab selectedLabel={childByGroup.family}/>;
      case "gothenburg": return <GothenburgDashboardTab/>;
      case "fun": return <ExploreDashboardTab selectedTab={childByGroup.fun as "overview"|"space"|"earth"}/>;
      case "resor": return initialSettings.showResorTab ? <ResorDashboard/> : startContent.home;
      case "hemmet3d": return initialSettings.showHemmet3DTab ? <SmarthemDashboard embedded selectedCategory={childByGroup.hemmet3d as "Översikt"|"Belysning"|"Media"|"Övervakning"|"El"|"Klimat"|"Administration"}/> : startContent.home;
      default: return startContent.everyday;
    }
  };
  const sidebar = <nav aria-label="Huvudnavigering" className="space-y-1 pb-5">
    {topMenus.filter(item=>(item.id!=="resor"||initialSettings.showResorTab)&&(item.id!=="hemmet3d"||initialSettings.showHemmet3DTab)).map(item=>{
      const group=isGroup(item.id);
      const isActive=activeTab===item.id;
      return <div key={item.id}>
        <button type="button" aria-expanded={group?expanded[item.id as Group]:undefined}
          aria-current={!group&&isActive?"page":undefined}
          onClick={()=>group ? setExpanded(prev=>({...prev,[item.id]:!prev[item.id as Group]})) : navigate(item.id)}
          className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${isActive?"bg-cyan-500/15 text-cyan-200":"text-slate-300 hover:bg-white/10 hover:text-white"}`}>
          {item.icon}<span className="flex-1">{item.label}</span>{group&&(expanded[item.id as Group]?<ChevronDown size={16}/>:<ChevronRight size={16}/>)}
        </button>
        {group&&expanded[item.id as Group]&&<div className="ml-5 border-l border-cyan-300/20 py-1 pl-3 space-y-0.5">
          {childMenus[item.id as Group].map(child=><button type="button" key={child.id}
            aria-current={isActive&&childByGroup[item.id as Group]===child.id?"page":undefined}
            onClick={()=>navigate(item.id,child.id)}
            className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition ${isActive&&childByGroup[item.id as Group]===child.id?"bg-cyan-600/25 text-cyan-100":"text-slate-400 hover:bg-white/10 hover:text-white"}`}>
            {child.icon}<span>{child.label}</span>
          </button>)}
        </div>}
      </div>;
    })}
    {initialSettings.showAdminButton&&<Link href="/admin" onClick={()=>setMobileOpen(false)} className="mt-5 flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm font-semibold text-slate-300 hover:bg-white/10"><Settings size={19}/> Admin</Link>}
  </nav>;
  return <div className="flex w-full min-w-0 gap-5 lg:gap-7">
    <button type="button" aria-label="Stäng sidomenyn" aria-hidden={!mobileOpen} tabIndex={mobileOpen ? 0 : -1} onClick={() => setMobileOpen(false)} className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 lg:hidden ${mobileOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`} />
    <aside ref={mobileSidebarRef} id="dashboard-mobile-navigation" aria-label="Sidomeny" className={`fixed inset-y-0 left-0 z-50 w-[min(19rem,85vw)] overflow-y-auto overscroll-contain border-r border-white/10 bg-[#111d30] p-4 shadow-2xl transition-transform duration-300 ease-out lg:sticky lg:top-4 lg:z-auto lg:h-[calc(100vh-2rem)] lg:w-64 lg:shrink-0 lg:translate-x-0 lg:rounded-2xl lg:border ${mobileOpen?"translate-x-0":"-translate-x-full"}`}>
      <div className="mb-5 flex items-center justify-between px-2 pt-2"><div><div className="text-lg font-bold text-white">{initialSettings.dashboardName}</div><p className="text-[10px] tracking-[.2em] text-cyan-300">NAVIGERING</p></div><button type="button" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden" onClick={()=>setMobileOpen(false)} aria-label="Stäng meny"><X size={20}/></button></div>
      {sidebar}
    </aside>
    <div className="min-w-0 flex-1">
      <div className="sticky top-0 z-30 mb-4 flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-[#111d30]/95 p-2 shadow-lg shadow-black/10 backdrop-blur-md lg:hidden">
        <button ref={mobileMenuButtonRef} type="button" aria-label="Öppna meny" aria-controls="dashboard-mobile-navigation" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(true)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-800 text-slate-100 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><Menu size={22}/></button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Du är här</p>
          <p className="truncate text-sm font-bold text-slate-100">{topMenus.find(item=>item.id===activeTab)?.label}{isGroup(activeTab)?` / ${childMenus[activeTab].find(c=>c.id===childByGroup[activeTab])?.label??""}`:""}</p>
        </div>
      </div>
      <div key={`${activeTab}-${isGroup(activeTab)?childByGroup[activeTab]:""}`} className="min-w-0 w-full animate-[fadeIn_250ms_ease-out]">{content()}</div>
    </div>
  </div>;
}
