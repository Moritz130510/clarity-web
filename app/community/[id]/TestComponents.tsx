'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { PRIMARY, starsFromScore } from '@/lib/helpers'
import type { CourseTest, TestQuestion, QuestionType } from '@/lib/types'

// ==========================================================================
// TEST CREATOR — Admin builds tests
// ==========================================================================

interface CreatorProps {
  courseId: string
  communityId: string
  existingTest: CourseTest | null
  onClose: () => void
  onSaved: () => void
}

interface DraftQuestion {
  id: string
  question_type: QuestionType
  question_text: string
  options: string[]
  correct_answer: string
}

function newDraftQuestion(): DraftQuestion {
  return {
    id: Math.random().toString(36).slice(2),
    question_type: 'multipleChoice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '0',
  }
}

export function TestCreatorModal({ courseId, communityId, existingTest, onClose, onSaved }: CreatorProps) {
  const { profile } = useProfile()
  const [title, setTitle] = useState(existingTest?.title ?? 'Test')
  const [questions, setQuestions] = useState<DraftQuestion[]>([])
  const [loading, setLoading] = useState(!!existingTest)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!existingTest) return
    supabase
      .from('community_course_test_questions')
      .select('*')
      .eq('test_id', existingTest.id)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setQuestions(data.map(q => ({
            id: q.id,
            question_type: q.question_type as QuestionType,
            question_text: q.question_text,
            options: q.options_json ? JSON.parse(q.options_json) : ['', '', '', ''],
            correct_answer: q.correct_answer ?? '',
          })))
        }
        setLoading(false)
      })
  }, [existingTest])

  function updateQuestion(idx: number, patch: Partial<DraftQuestion>) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))
  }

  async function save() {
    if (!profile) return
    if (questions.length === 0) { alert('Add at least one question'); return }
    if (questions.some(q => !q.question_text.trim())) { alert('All questions need text'); return }

    setSaving(true)

    let testId = existingTest?.id

    if (!testId) {
      const { data, error } = await supabase
        .from('community_course_tests')
        .insert({ course_id: courseId, community_id: communityId, created_by: profile.id, title })
        .select()
        .single()
      if (error || !data) { alert('Could not create test: ' + (error?.message ?? '')); setSaving(false); return }
      testId = data.id
    } else {
      await supabase.from('community_course_tests').update({ title }).eq('id', testId)
      await supabase.from('community_course_test_questions').delete().eq('test_id', testId)
    }

    const rows = questions.map((q, i) => ({
      test_id: testId,
      question_type: q.question_type,
      question_text: q.question_text.trim(),
      options_json: q.question_type === 'multipleChoice' ? JSON.stringify(q.options) : null,
      correct_answer: q.question_type === 'freeResponse' ? null : q.correct_answer,
      order_index: i,
    }))

    const { error: insErr } = await supabase.from('community_course_test_questions').insert(rows)
    if (insErr) { alert('Could not save questions: ' + insErr.message); setSaving(false); return }

    setSaving(false)
    onSaved()
    onClose()
  }

  if (loading) return (
    <Backdrop onClose={onClose}>
      <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading test…</div>
    </Backdrop>
  )

  return (
    <Backdrop onClose={onClose}>
      <Sticky>
        <button onClick={onClose} style={btnLink}>Cancel</button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{existingTest ? 'Edit Test' : 'New Test'}</span>
        <button onClick={save} disabled={saving} style={{ ...btnLink, fontWeight: 700, opacity: saving ? 0.5 : 1 }}>{saving ? '…' : 'Save'}</button>
      </Sticky>

      <div style={{ padding: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>Test title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 1 Quiz" style={{ ...inputStyle, marginTop: 6, marginBottom: 18 }} />

        {questions.map((q, i) => (
          <div key={q.id} style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 12, border: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>Question {i + 1}</span>
              <button onClick={() => setQuestions(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Remove</button>
            </div>

            <select value={q.question_type} onChange={e => updateQuestion(i, { question_type: e.target.value as QuestionType, correct_answer: e.target.value === 'trueFalse' ? 'true' : '0' })} style={{ ...inputStyle, marginBottom: 10 }}>
              <option value="multipleChoice">Multiple choice</option>
              <option value="trueFalse">True / False</option>
              <option value="fillInBlank">Fill in the blank</option>
              <option value="freeResponse">Free response</option>
            </select>

            <input value={q.question_text} onChange={e => updateQuestion(i, { question_text: e.target.value })} placeholder="Question text" style={{ ...inputStyle, marginBottom: 10 }} />

            {q.question_type === 'multipleChoice' && (
              <div>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <button onClick={() => updateQuestion(i, { correct_answer: String(oi) })} style={{ width: 22, height: 22, borderRadius: '50%', border: q.correct_answer === String(oi) ? `7px solid ${PRIMARY}` : '2px solid #D1D5DB', cursor: 'pointer', background: 'white', flexShrink: 0 }} title="Correct answer" />
                    <input value={opt} onChange={e => { const next = [...q.options]; next[oi] = e.target.value; updateQuestion(i, { options: next }) }} placeholder={`Option ${oi + 1}`} style={{ ...inputStyle, marginBottom: 0 }} />
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Tap a circle to mark the correct answer</div>
              </div>
            )}

            {q.question_type === 'trueFalse' && (
              <div style={{ display: 'flex', gap: 10 }}>
                {(['true', 'false'] as const).map(v => (
                  <button key={v} onClick={() => updateQuestion(i, { correct_answer: v })} style={{ flex: 1, padding: 10, borderRadius: 10, border: q.correct_answer === v ? 'none' : '1px solid #E5E7EB', backgroundColor: q.correct_answer === v ? PRIMARY : 'white', color: q.correct_answer === v ? 'white' : '#111', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {v === 'true' ? 'True (correct)' : 'False (correct)'}
                  </button>
                ))}
              </div>
            )}

            {q.question_type === 'fillInBlank' && (
              <input value={q.correct_answer} onChange={e => updateQuestion(i, { correct_answer: e.target.value })} placeholder="Correct answer (case insensitive)" style={inputStyle} />
            )}

            {q.question_type === 'freeResponse' && (
              <div style={{ padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, fontSize: 12, color: '#6B7280' }}>
                Free responses are always counted as correct.
              </div>
            )}
          </div>
        ))}

        <button onClick={() => setQuestions(prev => [...prev, newDraftQuestion()])} style={{ width: '100%', padding: 12, background: 'white', border: `1.5px dashed ${PRIMARY}`, borderRadius: 12, color: PRIMARY, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18 }}>
          + Add Question
        </button>
      </div>
    </Backdrop>
  )
}

// ==========================================================================
// TEST TAKER — Student takes test, gets stars, result saved
// ==========================================================================

interface TakerProps {
  test: CourseTest
  courseId: string
  communityId: string
  onClose: () => void
  onComplete: (passed: boolean, stars: number) => void
}

export function TestTakerModal({ test, courseId, communityId, onClose, onComplete }: TakerProps) {
  const { profile } = useProfile()
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ score: number; stars: number; passed: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('community_course_test_questions')
      .select('*')
      .eq('test_id', test.id)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        setQuestions((data ?? []) as TestQuestion[])
        setLoading(false)
      })
  }, [test.id])

  async function submit() {
    if (!profile) return
    setSubmitting(true)

    let correct = 0
    for (const q of questions) {
      const a = answers[q.id] ?? ''
      if (q.question_type === 'freeResponse') { correct++; continue }
      if (q.question_type === 'fillInBlank') {
        if (a.trim().toLowerCase() === (q.correct_answer ?? '').trim().toLowerCase()) correct++
      } else {
        if (a === q.correct_answer) correct++
      }
    }
    const score = questions.length > 0 ? correct / questions.length : 0
    const { stars, passed } = starsFromScore(score)

    await supabase.from('community_course_test_results').insert({
      test_id: test.id, course_id: courseId, community_id: communityId,
      profile_id: profile.id, score, stars, passed,
    })

    setResult({ score, stars, passed })
    setSubmitting(false)
  }

  if (loading) return <Backdrop onClose={onClose}><div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading…</div></Backdrop>

  if (result) {
    return (
      <Backdrop onClose={onClose}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{result.passed ? '🎉' : '💪'}</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>{result.passed ? 'Passed!' : 'Try Again'}</h2>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>You scored {Math.round(result.score * 100)}%</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} style={{ fontSize: 32, color: n <= result.stars ? '#F59E0B' : '#E5E7EB' }}>★</span>
            ))}
          </div>
          <button onClick={() => { onComplete(result.passed, result.stars); onClose() }} style={{ width: '100%', padding: 14, backgroundColor: PRIMARY, color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
          {!result.passed && (
            <button onClick={() => { setResult(null); setAnswers({}); setStep(0) }} style={{ width: '100%', padding: 14, marginTop: 8, background: 'white', color: PRIMARY, border: `1px solid ${PRIMARY}`, borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Try Again</button>
          )}
        </div>
      </Backdrop>
    )
  }

  if (questions.length === 0) return <Backdrop onClose={onClose}><div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>No questions yet</div></Backdrop>

  const q = questions[step]
  const isLast = step === questions.length - 1
  const hasAnswered = !!answers[q.id] || q.question_type === 'freeResponse'

  return (
    <Backdrop onClose={onClose}>
      <Sticky>
        <button onClick={onClose} style={btnLink}>Cancel</button>
        <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>{step + 1} / {questions.length}</span>
        <div style={{ width: 60 }} />
      </Sticky>

      <div style={{ height: 4, background: '#E5E7EB' }}>
        <div style={{ height: '100%', width: `${((step + 1) / questions.length) * 100}%`, background: PRIMARY, transition: 'width 0.3s' }} />
      </div>

      <div style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 18, lineHeight: 1.4 }}>{q.question_text}</h3>

        {q.question_type === 'multipleChoice' && (() => {
          const opts: string[] = q.options_json ? JSON.parse(q.options_json) : []
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opts.map((opt, oi) => (
                <button key={oi} onClick={() => setAnswers(p => ({ ...p, [q.id]: String(oi) }))} style={optionStyle(answers[q.id] === String(oi))}>{opt}</button>
              ))}
            </div>
          )
        })()}

        {q.question_type === 'trueFalse' && (
          <div style={{ display: 'flex', gap: 10 }}>
            {(['true', 'false'] as const).map(v => (
              <button key={v} onClick={() => setAnswers(p => ({ ...p, [q.id]: v }))} style={{ ...optionStyle(answers[q.id] === v), flex: 1, textTransform: 'capitalize' }}>{v}</button>
            ))}
          </div>
        )}

        {q.question_type === 'fillInBlank' && (
          <input value={answers[q.id] ?? ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} placeholder="Type your answer…" autoFocus style={{ ...inputStyle, fontSize: 16, padding: 14 }} />
        )}

        {q.question_type === 'freeResponse' && (
          <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} rows={5} placeholder="Type your answer…" autoFocus style={{ ...inputStyle, fontSize: 15, padding: 14, resize: 'none', lineHeight: 1.5 }} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: 18, borderTop: '1px solid #E5E7EB', backgroundColor: 'white' }}>
        {step > 0 && <button onClick={() => setStep(s => s - 1)} style={navBtn(false)}>Back</button>}
        {!isLast && <button onClick={() => setStep(s => s + 1)} disabled={!hasAnswered} style={navBtn(true, !hasAnswered)}>Next</button>}
        {isLast && <button onClick={submit} disabled={!hasAnswered || submitting} style={navBtn(true, !hasAnswered || submitting)}>{submitting ? '…' : 'Submit'}</button>}
      </div>
    </Backdrop>
  )
}

// Helpers
function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', maxHeight: '92vh', overflowY: 'auto' }}>{children}</div>
    </div>
  )
}

function Sticky({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'sticky', top: 0, backgroundColor: '#F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #E5E7EB', zIndex: 1 }}>{children}</div>
  )
}

const btnLink: React.CSSProperties = { background: 'none', border: 'none', color: PRIMARY, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', backgroundColor: 'white', marginBottom: 4 }

function optionStyle(selected: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: selected ? `2px solid ${PRIMARY}` : '1px solid #E5E7EB',
    backgroundColor: selected ? '#EDE9FE' : 'white',
    color: '#111', fontSize: 15, fontWeight: selected ? 700 : 500,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
  }
}

function navBtn(primary: boolean, disabled?: boolean): React.CSSProperties {
  return {
    flex: 1, padding: 14, borderRadius: 12, border: 'none',
    backgroundColor: primary ? PRIMARY : '#F3F4F6',
    color: primary ? 'white' : '#374151',
    fontSize: 15, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, fontFamily: 'inherit',
  }
}
