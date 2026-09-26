import React, { useState } from "react";

/**
 * Landing sections ported from the EcoGuard Ghana v1.1 HTML prototype
 * (hero with radar card, statistics row, early-warning alerts,
 * agency coordination grid and the "how it could work" workflow).
 * All data here is prototype / demo content.
 */

type LandingTab = "coverage" | "notifications";

const HERO_PRIMARY_TAB: LandingTab = "coverage";
const HERO_SECONDARY_TAB: LandingTab = "notifications";

/* -------------------------------------------------------------------------- */
/* Shared section header (eyebrow + title, optional right-hand controls)       */
/* -------------------------------------------------------------------------- */
function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-5">
      <div>
        <p className="text-[11px] tracking-[1.6px] font-extrabold text-[#559f45] dark:text-[#7ed957] mb-2.5">
          {eyebrow}
        </p>
        <h2 className="text-[26px] md:text-[30px] leading-tight font-bold text-[#17231b] dark:text-stone-100">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HERO — dark green band, radar coverage card                                */
/* -------------------------------------------------------------------------- */
export function EcoHero({
  userName,
  onNavigate,
}: {
  userName: string;
  onNavigate: (tab: LandingTab) => void;
}) {
  const firstName = userName.split(" ")[0];

  return (
    <section className="rounded-2xl overflow-hidden bg-[linear-gradient(120deg,#10271b,#173c28)] text-white p-8 md:p-12 grid grid-cols-1 lg:grid-cols-[1.25fr_.75fr] items-center gap-10">
      <div>
        <p className="text-[11px] tracking-[1.6px] font-extrabold text-[#9ddd7e] mb-2.5">
          🇬🇭 GHANA ENVIRONMENTAL WATCH
        </p>
        <h1 className="text-4xl md:text-5xl leading-[1.05] tracking-[-0.04em] mb-4 font-bold">
          Detect land disturbance.
          <br />
          <span className="text-[#9fe17e]">Protect Ghana.</span>
        </h1>
        <p className="text-[#d1ddd5] leading-[1.7] text-[15px] max-w-[610px]">
          Welcome back, {firstName}. A prototype platform for monitoring forest
          reserves, water bodies and land disturbance using satellite imagery
          and change detection.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => onNavigate(HERO_PRIMARY_TAB)}
            className="bg-[#91db70] text-[#10271b] rounded-[9px] px-[17px] py-3 text-[13px] font-bold hover:brightness-105 transition-all cursor-pointer"
          >
            Open Monitoring Map
          </button>
          <button
            onClick={() => onNavigate(HERO_SECONDARY_TAB)}
            className="bg-white/5 text-white border border-white/25 rounded-[9px] px-[17px] py-3 text-[13px] font-semibold hover:bg-white/10 transition-all cursor-pointer"
          >
            View Alerts
          </button>
        </div>
      </div>

      <div className="bg-white/10 border border-white/20 rounded-[20px] p-7 text-center">
        <div className="eg-radar">
          <div className="eg-pulse" />
          <div className="eg-cross absolute inset-0" />
        </div>
        <div>
          <strong className="text-sm font-extrabold">Monitoring Coverage</strong>
          <p className="text-[11px] text-[#b9cbbf] mt-1">
            Ghana • Demo data
          </p>
        </div>
        <div className="eg-scan">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* STATS ROW — white band with 4 divided statistics                           */
/* -------------------------------------------------------------------------- */
const LANDING_STATS: Array<{ icon: string; value: string; label: string }> = [
  { icon: "🌳", value: "45", label: "Forest reserves monitored*" },
  { icon: "⚠️", value: "18", label: "Demo disturbance alerts" },
  { icon: "💧", value: "12", label: "Water-risk locations" },
  { icon: "📡", value: "24/7", label: "Planned monitoring model" },
];

export function EcoStats() {
  return (
    <section>
      <div className="bg-white dark:bg-stone-900 border border-[#e1e8e1] dark:border-stone-700 rounded-xl px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-5 md:gap-y-0 md:divide-x md:divide-[#e3e9e4] dark:md:divide-stone-700">
        {LANDING_STATS.map((stat) => (
          <div key={stat.label} className="flex gap-3 items-center md:px-4 first:md:pl-0 last:md:pr-0">
            <span className="text-[25px] leading-none">{stat.icon}</span>
            <div>
              <b className="block font-display text-[22px] leading-none font-bold text-[#17231b] dark:text-stone-100">
                {stat.value}
              </b>
              <small className="block text-[11px] text-[#66736b] dark:text-stone-400 mt-1">
                {stat.label}
              </small>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#7b857e] dark:text-stone-500 mt-2.5 px-1">
        *The 45 figure refers to forest reserves reported as affected in the
        project&apos;s research context; this prototype&apos;s map data are
        illustrative.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* ALERTS — early-warning list with working acknowledge controls              */
/* -------------------------------------------------------------------------- */
interface LandingAlert {
  id: string;
  severity: "high" | "medium" | "low";
  icon: string;
  title: string;
  detail: string;
  meta: string;
}

const LANDING_ALERTS: LandingAlert[] = [
  {
    id: "alert-high-oda",
    severity: "high",
    icon: "⚠",
    title: "High-risk land disturbance",
    detail: "Demo location near Oda River • Forest-edge disturbance detected",
    meta: "Today • Requires field verification",
  },
  {
    id: "alert-medium-ashanti",
    severity: "medium",
    icon: "!",
    title: "Vegetation change detected",
    detail:
      "Ashanti Region demo site • Change exceeds monitoring threshold",
    meta: "Yesterday • Review recommended",
  },
  {
    id: "alert-low-western",
    severity: "low",
    icon: "i",
    title: "New imagery available",
    detail: "Western Region demo site • Comparison ready",
    meta: "2 days ago • No automatic conclusion",
  },
];

const SEVERITY_BAR: Record<LandingAlert["severity"], string> = {
  high: "border-l-[#d94b42]",
  medium: "border-l-[#e0a32d]",
  low: "border-l-[#5d9c55]",
};

export function EcoAlerts() {
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const acknowledgeAll = () => {
    setAcknowledged(
      Object.fromEntries(LANDING_ALERTS.map((alert) => [alert.id, true]))
    );
  };

  return (
    <section>
      <SectionHead eyebrow="EARLY WARNING" title="Recent Alerts">
        <button
          onClick={acknowledgeAll}
          className="bg-[#173322] text-white rounded-[9px] px-3 py-2 text-[11px] font-bold hover:bg-[#1e4230] transition-all cursor-pointer"
        >
          Acknowledge all
        </button>
      </SectionHead>

      <div className="grid gap-2.5">
        {LANDING_ALERTS.map((alert) => {
          const isAcked = acknowledged[alert.id];
          return (
            <article
              key={alert.id}
              className={`flex flex-wrap items-center gap-3.5 bg-white dark:bg-stone-900 border border-[#e1e8e1] dark:border-stone-700 border-l-[5px] p-4 rounded-[10px] transition-opacity ${
                SEVERITY_BAR[alert.severity]
              } ${isAcked ? "eg-acknowledged" : ""}`}
            >
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#fff0ed] dark:bg-red-950/50 grid place-items-center font-extrabold text-[#c7463f] text-sm">
                {alert.icon}
              </div>
              <div className="flex-1 min-w-[200px]">
                <b className="block text-[13px] font-bold text-[#17231b] dark:text-stone-100">
                  {alert.title}
                </b>
                <p className="text-xs text-[#58665d] dark:text-stone-400 my-1 leading-relaxed">
                  {alert.detail}
                </p>
                <small className="block text-[10px] text-[#89938c] dark:text-stone-500">
                  {alert.meta}
                </small>
              </div>
              <button
                onClick={() =>
                  setAcknowledged((prev) => ({ ...prev, [alert.id]: true }))
                }
                disabled={isAcked}
                className="bg-[#edf3ec] dark:bg-stone-800 text-[#17231b] dark:text-stone-200 border-0 rounded-[7px] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#e0eadd] dark:hover:bg-stone-700 disabled:cursor-default transition-colors"
              >
                {isAcked ? "Acknowledged ✓" : "Acknowledge"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* AGENCIES — coordination grid                                               */
/* -------------------------------------------------------------------------- */
const LANDING_AGENCIES: Array<{ icon: string; name: string; note: string }> = [
  {
    icon: "🌲",
    name: "Forestry Commission / Forest Services Division",
    note: "Particularly relevant to forest reserves and forest protection.",
  },
  {
    icon: "🛡️",
    name: "NAIMOS",
    note: "Relevant to coordinating operations against illegal mining.",
  },
  {
    icon: "⛏️",
    name: "Minerals Commission",
    note: "Relevant to mining regulation and compliance.",
  },
  {
    icon: "🗺️",
    name: "Lands Commission",
    note: "Relevant to land information, surveying and mapping.",
  },
  {
    icon: "🌍",
    name: "EPA",
    note: "Relevant to environmental regulation and compliance.",
  },
];

export function EcoAgencies() {
  return (
    <section>
      <SectionHead eyebrow="COORDINATION" title="Relevant Agencies" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {LANDING_AGENCIES.map((agency) => (
          <article
            key={agency.name}
            className="bg-white dark:bg-stone-900 border border-[#e1e8e1] dark:border-stone-700 rounded-[13px] p-5"
          >
            <span className="text-[26px] leading-none">{agency.icon}</span>
            <h3 className="text-[13px] leading-[1.4] font-bold mt-3 mb-2 text-[#17231b] dark:text-stone-100">
              {agency.name}
            </h3>
            <p className="text-[11px] leading-[1.6] text-[#66736b] dark:text-stone-400">
              {agency.note}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* WORKFLOW — "From satellite image to action"                                */
/* -------------------------------------------------------------------------- */
const LANDING_WORKFLOW: Array<{ step: string; title: string; note: string }> = [
  {
    step: "01",
    title: "Collect",
    note: "Acquire regularly updated satellite imagery.",
  },
  {
    step: "02",
    title: "Compare",
    note: "Compare imagery from different dates to identify land-cover change.",
  },
  {
    step: "03",
    title: "Flag",
    note: "Prioritize unusual disturbances for human review.",
  },
  {
    step: "04",
    title: "Notify",
    note: "Send location and evidence to relevant authorities.",
  },
];

export function EcoWorkflow() {
  return (
    <section className="bg-[#eaf1e9] dark:bg-[#131f18] rounded-2xl p-7 md:p-9">
      <p className="text-[11px] tracking-[1.6px] font-extrabold text-[#559f45] dark:text-[#7ed957] mb-2.5">
        HOW IT COULD WORK
      </p>
      <h2 className="text-[26px] md:text-[30px] leading-tight font-bold text-[#17231b] dark:text-stone-100 mb-6">
        From satellite image to action
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {LANDING_WORKFLOW.map((item) => (
          <div
            key={item.step}
            className="bg-white dark:bg-stone-900 rounded-[13px] p-5"
          >
            <b className="text-[#559f45] dark:text-[#7ed957] text-xs font-extrabold">
              {item.step}
            </b>
            <h3 className="text-[15px] font-bold my-2.5 text-[#17231b] dark:text-stone-100">
              {item.title}
            </h3>
            <p className="text-[11px] text-[#68756d] dark:text-stone-400 leading-[1.6]">
              {item.note}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
