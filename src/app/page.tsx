import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Phone, DollarSign, Shield, BarChart3, MessageSquare, Camera,
  Calendar, Users, Check, ArrowRight, PhoneMissed, Bot, Clock,
  FileText, Lock, Sparkles, Zap, Headphones, Send, ClipboardCheck,
} from "lucide-react";
import { PricingSection } from "@/components/marketing/pricing-toggle";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="BlitzResponse" className="h-10 w-auto" />
            <span className="hidden text-xs text-gray-400 sm:block">AI Emergency Dispatch<br/>for Restoration Pros</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How it works</a>
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/auth/sign-up" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Get started risk-free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
              <Bot className="h-4 w-4" />
              AI-Powered Emergency Dispatch
            </div>

            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl leading-[1.1]">
              Never let another{" "}
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                $3K–$20K job
              </span>{" "}
              go to your competitor
            </h1>

            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              BlitzResponse answers every call 24/7 with AI that triages emergencies, generates instant quotes from <em>your</em> pricing, books technicians, and dispatches your on-call team. Capture 2–5 extra jobs every month — even at 2 AM.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/sign-up" className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all hover:shadow-xl">
                Get started risk-free <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#how-it-works" className="flex items-center gap-2 rounded-xl border border-gray-300 px-8 py-3.5 text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <Phone className="h-5 w-5" /> See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500">14-day money-back guarantee · Setup fee waived on annual</p>
          </div>

          {/* Stats bar */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {[
              { value: "2–5", label: "Extra jobs captured/mo", sub: "avg across clients" },
              { value: "< 1s", label: "Call answer time", sub: "24/7/365" },
              { value: "99.7%", label: "Answer rate", sub: "vs ~60% industry avg" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-3 text-xs text-gray-400">Based on industry averages &amp; early beta results</p>
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────── */}
      <section className="bg-gray-900 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <PhoneMissed className="mx-auto h-10 w-10 text-red-400" />
          <h2 className="mt-4 text-3xl font-bold text-white">Every missed call is money walking out the door</h2>
          <p className="mt-4 text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            The average water damage job is worth <span className="text-white font-semibold">$4,500</span>. When a homeowner calls at 2 AM with a burst pipe and nobody answers, they don't leave a voicemail — they call the next company on Google. <span className="text-red-400 font-medium">That's your revenue in their pocket.</span>
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6 max-w-xl mx-auto">
            {[
              { num: "67%", label: "of callers won't leave a voicemail" },
              { num: "85%", label: "call the next company within 5 min" },
              { num: "$4,500", label: "avg restoration job value" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.num}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-gray-50 border-y border-gray-200">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Live in 30 minutes. Here's how it works.</h2>
            <p className="mt-3 text-lg text-gray-600">From missed calls to captured jobs in three steps.</p>
          </div>
          <div className="mt-14 grid gap-12 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: ClipboardCheck,
                title: "You set up (30 min)",
                desc: "Upload your pricing CSV, connect Google Calendar, add your team and on-call schedule. The AI agent trains itself on your rates and services.",
                color: "bg-blue-600",
              },
              {
                step: "2",
                icon: Headphones,
                title: "AI answers every call",
                desc: "A homeowner calls your number at 2 AM. The AI picks up instantly, asks safety questions, triages the damage, generates a quote from your matrix, and books a technician visit.",
                color: "bg-orange-500",
              },
              {
                step: "3",
                icon: Send,
                title: "Your tech gets dispatched",
                desc: "The on-call tech gets an SMS with the job details. The homeowner gets a confirmation text with insurance tips. You wake up to a $4,500 job on your dashboard.",
                color: "bg-green-600",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${item.color} text-white shadow-lg`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="mt-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Step {item.step}</div>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Everything your front desk does — but 24/7</h2>
            <p className="mt-3 text-lg text-gray-600">And it never calls in sick, takes a lunch break, or puts anyone on hold.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Phone, title: "AI call answering", desc: "Answers every inbound call instantly with a natural-sounding AI voice. Handles 10+ simultaneous calls — no hold music, ever." },
              { icon: Shield, title: "Emergency triage", desc: "Asks safety questions first, then classifies damage using IICRC standards (Cat 1–4, Class 1–4). Flags electrical and gas hazards." },
              { icon: DollarSign, title: "Instant quoting", desc: "Generates personalized preliminary quotes from your uploaded pricing matrix. Xactimate-compatible. Always includes a verbal + SMS disclaimer." },
              { icon: Camera, title: "Photo damage analysis", desc: "Callers text damage photos. GPT-4o Vision scores severity 1–10 and refines your quote on the spot." },
              { icon: Calendar, title: "Appointment booking", desc: "Checks your Google Calendar in real-time and books the next available slot. Sends confirmation to caller and tech." },
              { icon: Users, title: "Smart tech dispatch", desc: "Auto-notifies your on-call technician via SMS with job details. Routes by specialty — water techs get water jobs." },
              { icon: MessageSquare, title: "SMS follow-up chains", desc: "Sends confirmation, insurance filing tips, pre-appointment reminders, and post-service review requests. EN + ES." },
              { icon: FileText, title: "Insurance claim guidance", desc: "Sends callers step-by-step insurance tips via SMS. 'Document before cleanup, don't discard materials, file within 24hrs.'" },
              { icon: BarChart3, title: "ROI dashboard", desc: "Track every call, conversion, and dollar saved. See exactly how many jobs BlitzResponse captured this month." },
              { icon: Clock, title: "Seamless Spanish support", desc: "Auto-detects Spanish speakers mid-call and switches seamlessly. All SMS templates and knowledge base entries are bilingual." },
            ].map((f, i) => (
              <div key={f.title} className="rounded-xl border border-gray-200 p-6 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <f.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────── */}
      <PricingSection />

      {/* ── FAQ ───────────────────────────────────────── */}
      <section id="faq" className="bg-gray-50 py-20 border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Frequently asked questions</h2>
          <div className="mt-10 space-y-6">
            {[
              { q: "Does the AI really sound like a human?", a: "Yes. We use Retell AI with state-of-the-art voice synthesis. It sounds natural, professional, and calm — exactly the tone a panicked homeowner needs at 2 AM. Most callers don't realize they're speaking with AI." },
              { q: "What if the caller wants to talk to a real person?", a: "The AI immediately offers to transfer them to your team. It never forces anyone to stay on the AI line. Your caller's experience always comes first." },
              { q: "How accurate are the quotes?", a: "The AI uses your actual pricing matrix (Xactimate-compatible) combined with IICRC damage classification. If callers text photos, GPT-4o Vision refines the estimate based on visible damage. Every quote includes a clear verbal and SMS disclaimer that it's preliminary." },
              { q: "Can it really handle Spanish speakers?", a: "Yes. The AI auto-detects Spanish mid-call and switches seamlessly — no awkward pauses. All SMS follow-ups, insurance tips, and knowledge base answers have Spanish variants built in." },
              { q: "What happens if the call drops or audio is bad?", a: "If a call drops, the AI automatically sends a recovery SMS: 'Looks like we got disconnected — text us or call back anytime.' If audio is bad after 2 attempts, it offers to switch to text messaging." },
              { q: "Do I need to buy a new phone number?", a: "We provision a dedicated phone number for you during setup. You can forward your existing business line to it, or use the new number directly. Either way, setup takes about 5 minutes." },
              { q: "How does the money-back guarantee work?", a: "You pay the setup fee + first month upfront. If BlitzResponse doesn't capture a single job for you within 14 days, we refund everything — no questions asked. We're that confident it works." },
              { q: "What's the setup fee for?", a: "It covers creating your custom AI agent, configuring your phone number, uploading your pricing matrix, and a guided onboarding session. Annual plans get the setup fee waived entirely." },
              { q: "What's the annual discount?", a: "Pay annually and save ~20% plus we waive the setup fee completely. That's like getting 2+ months free and the setup at no cost. You can switch between monthly and annual billing anytime." },
              { q: "Is my data secure?", a: "Call recordings are stored with Retell AI on encrypted infrastructure. We store transcripts and metadata in encrypted PostgreSQL. No PHI is stored. Architecture is designed to be SOC 2-friendly." },
            ].map((item) => (
              <div key={item.q} className="border-b border-gray-200 pb-6">
                <h3 className="text-base font-semibold text-gray-900">{item.q}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Badges ──────────────────────────────── */}
      <section className="py-12 border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400">
            <div className="flex items-center gap-2"><Lock className="h-5 w-5" /><span className="text-sm">256-bit encryption</span></div>
            <div className="flex items-center gap-2"><Shield className="h-5 w-5" /><span className="text-sm">SOC 2 architecture</span></div>
            <div className="flex items-center gap-2"><Zap className="h-5 w-5" /><span className="text-sm">99.9% uptime SLA</span></div>
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5" /><span className="text-sm">IICRC standards</span></div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section id="demo" className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Stop losing jobs to missed calls</h2>
          <p className="mt-3 text-lg text-blue-100">14-day money-back guarantee. If it doesn't capture a job, full refund.</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/sign-up" className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-lg font-semibold text-blue-700 hover:bg-blue-50 transition-colors">
              Get started risk-free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-200">Questions? Email us at hello@blitzresponse.io</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BlitzResponse" className="h-8 w-auto" />
            <span className="text-xs text-gray-400">AI Emergency Dispatch for Restoration Pros</span>
          </div>
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} BlitzResponse.io · All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
