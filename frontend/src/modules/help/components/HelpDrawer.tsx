import { X, BookOpen, Lightbulb, HelpCircle, Sparkles, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import type { PageHelp, HelpSection } from '../helpContent';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  help: PageHelp | null;
}

export default function HelpDrawer({ isOpen, onClose, help }: Props) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 no-print"
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div
        className={clsx(
          'fixed top-0 left-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col no-print',
          'animate-slide-in',
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-l from-brand-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">راهنمای کاربری</h2>
              <p className="text-xs text-slate-500">راهنمای گام‌به‌گام برای این صفحه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!help ? (
            <div className="p-8 text-center text-slate-500">
              <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="font-medium mb-2">راهنمایی برای این صفحه موجود نیست</p>
              <p className="text-sm">در حال تکمیل راهنمای این بخش هستیم</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-brand-700 mb-2">{help.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{help.description}</p>
              </div>

              {/* Quick Start */}
              {help.quickStart && help.quickStart.length > 0 && (
                <div className="bg-gradient-to-bl from-emerald-50 to-white rounded-xl p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-emerald-800">شروع سریع</h4>
                  </div>
                  <ol className="space-y-2">
                    {help.quickStart.map((step: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Sections */}
              {help.sections.map((section: HelpSection, idx: number) => (
                <div key={idx} className="border-b border-slate-100 last:border-0 pb-5 last:pb-0">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-brand-500 rounded"></span>
                    {section.title}
                  </h4>
                  {section.items && section.items.length > 0 && (
                    <ul className="space-y-2">
                      {section.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <ChevronLeft className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.tips && section.tips.length > 0 && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      {section.tips.map((tip: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* FAQs */}
              {help.faqs && help.faqs.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-5 h-5 text-slate-600" />
                    <h4 className="font-bold text-slate-800">سوالات متداول</h4>
                  </div>
                  <div className="space-y-3">
                    {help.faqs.map((faq: { q: string; a: string }, i: number) => (
                      <div key={i}>
                        <div className="font-medium text-slate-800 text-sm mb-1">
                          ❓ {faq.q}
                        </div>
                        <div className="text-sm text-slate-600 ps-4 leading-relaxed">
                          {faq.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg transition-colors"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </>
  );
}
