import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Phone, Zap, Clock, DollarSign, Shield, BarChart3, MessageSquare, Camera, Calendar, Users, Check, ArrowRight, PhoneMissed, Bot } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2"><img src="/logo.png" alt="BlitzResponse" className="h-10 w-auto" /></Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Start free trial</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700"><Bot className="h-4 w-4" />AI-Powered Emergency Dispatch</div>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">Never miss an <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">emergency call</span> again</h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">BlitzResponse answers every call 24/7 with AI that triages emergencies, generates instant quotes from your pricing, books technicians, and dispatches your on-call team — so you capture every $3K–$20K job.</p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/sign-up" className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700">Start 14-day free trial <ArrowRight className="h-5 w-5" /></Link>
              <a href="#demo" className="flex items-center gap-2 rounded-xl border border-gray-300 px-8 py-3.5 text-lg font-semibold text-gray-700 hover:bg-gray-50"><Phone className="h-5 w-5" /> Hear a live demo</a>
            </div>
            <p className="mt-4 text-sm text-gray-500">No credit card required · Setup in under 30 minutes</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {[{ value: "$28k+", label: "Avg revenue saved/mo" },{ value: "< 1s", label: "Answer time" },{ value: "99.7%", label: "Call answer rate" }].map((s) => (<div key={s.label} className="text-center"><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-sm text-gray-500">{s.label}</p></div>))}
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <PhoneMissed className="mx-auto h-10 w-10 text-red-400" />
          <h2 className="mt-4 text-3xl font-bold text-white">One missed call = one lost job</h2>
          <p className="mt-3 text-lg text-gray-400">The average water damage job is worth $4,500. When a homeowner calls at 2 AM with a burst pipe and nobody answers, they call your competitor. BlitzResponse makes sure that never happens.</p>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center"><h2 className="text-3xl font-bold text-gray-900">Everything your front desk does — but 24/7</h2><p className="mt-3 text-lg text-gray-600">And it never calls in sick.</p></div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[{icon:Phone,title:"AI call answering",desc:"Answers every inbound call instantly with a natural-sounding AI voice. Handles multiple calls simultaneously."},{icon:Shield,title:"Emergency triage",desc:"Asks safety questions, classifies damage using IICRC standards (Cat 1–4), and determines urgency."},{icon:DollarSign,title:"Instant quoting",desc:"Generates personalized preliminary quotes from your uploaded pricing matrix. Xactimate-compatible."},{icon:Camera,title:"Photo analysis",desc:"Callers text damage photos. GPT-4o Vision scores severity 1–10 and refines the estimate."},{icon:Calendar,title:"Appointment booking",desc:"Checks your Google Calendar and books the next available slot. No double-bookings."},{icon:Users,title:"Tech dispatch",desc:"Auto-notifies your on-call technician via SMS with job details, address, and caller info."},{icon:MessageSquare,title:"SMS follow-up",desc:"Sends confirmation, insurance filing tips, pre-appointment reminders, and review requests."},{icon:BarChart3,title:"ROI dashboard",desc:"Track every call, conversion, and dollar saved. See exactly what BlitzResponse earns you."},{icon:Clock,title:"Spanish support",desc:"Detects Spanish speakers and switches seamlessly. Bilingual SMS templates included."}].map((f)=>(<div key={f.title} className="rounded-xl border border-gray-200 p-6 hover:border-blue-200 hover:shadow-md transition-all"><f.icon className="h-8 w-8 text-blue-600" /><h3 className="mt-3 text-lg font-semibold text-gray-900">{f.title}</h3><p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.desc}</p></div>))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center"><h2 className="text-3xl font-bold text-gray-900">Pricing that pays for itself</h2><p className="mt-3 text-lg text-gray-600">One captured job covers your entire monthly cost.</p></div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {[{name:"Starter",price:997,desc:"100 AI calls · 1 number · 3 team",pop:false,features:["AI voice answering 24/7","Emergency triage & quoting","Call log & transcripts","Basic analytics","Google Calendar booking","SMS follow-up (1 template)"]},{name:"Pro",price:1497,desc:"500 AI calls · 2 numbers · 10 team",pop:true,features:["Everything in Starter","Photo damage analysis","Full SMS drip chains","Advanced analytics & ROI","Custom voice scripts","On-call scheduling","Priority support"]},{name:"Enterprise",price:1997,desc:"Unlimited calls · 5 numbers · Unlimited team",pop:false,features:["Everything in Pro","White-label branding","Custom voice cloning","API access","Multi-location support","Dedicated onboarding","Custom integrations"]}].map((p)=>(<div key={p.name} className={`relative rounded-2xl border ${p.pop?"border-blue-600 shadow-xl shadow-blue-600/10":"border-gray-200"} bg-white p-8`}>{p.pop&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">Most popular</div>}<p className="text-lg font-semibold text-gray-900">{p.name}</p><p className="mt-2"><span className="text-4xl font-bold text-gray-900">${p.price.toLocaleString()}</span><span className="text-gray-500">/mo</span></p><p className="mt-1 text-sm text-gray-500">{p.desc}</p><Link href="/sign-up" className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold ${p.pop?"bg-blue-600 text-white hover:bg-blue-700":"border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>Start free trial</Link><ul className="mt-6 space-y-2.5">{p.features.map((f)=>(<li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check className="h-4 w-4 text-blue-600 shrink-0" />{f}</li>))}</ul></div>))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">All plans include a one-time $497 setup fee. Overage: $2.50/call beyond your tier limit.</p>
        </div>
      </section>

      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Frequently asked questions</h2>
          <div className="mt-10 space-y-6">
            {[{q:"Does the AI really sound like a human?",a:"Yes. We use state-of-the-art voice AI that sounds natural and professional. Callers often don't realize they're speaking with AI."},{q:"What if the caller wants a real person?",a:"The AI immediately offers to transfer. It never forces callers to stay on the AI line."},{q:"How does quoting work?",a:"Upload your pricing matrix (Xactimate-compatible CSV). The AI uses your rates plus IICRC damage classification to generate a range — always with a verbal and SMS disclaimer."},{q:"Can it handle Spanish speakers?",a:"Yes. Auto-detects Spanish and switches seamlessly. All SMS templates have Spanish variants."},{q:"What about call drops or bad audio?",a:"If the call drops, the AI auto-sends a recovery SMS. If audio is bad after 2 attempts, it switches to text."},{q:"How long does setup take?",a:"Most companies are live within 30 minutes. Upload pricing, connect calendar, add team — the AI does the rest."}].map((i)=>(<div key={i.q} className="border-b border-gray-200 pb-6"><h3 className="text-base font-semibold text-gray-900">{i.q}</h3><p className="mt-2 text-sm text-gray-600 leading-relaxed">{i.a}</p></div>))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Stop losing jobs to missed calls</h2>
          <p className="mt-3 text-lg text-blue-100">Start your 14-day free trial. No credit card required.</p>
          <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-lg font-semibold text-blue-700 hover:bg-blue-50">Get started now <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <img src="/logo.png" alt="BlitzResponse" className="h-8 w-auto" />
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} BlitzResponse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
