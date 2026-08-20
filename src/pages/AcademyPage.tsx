// 观微学馆：课程列表（分组）+ 课程详情（章节 + 练习自检）
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { COURSES, courseById, type Course } from '@core/data/courses';
import { classicById } from '@core/data/classics';
import { ARTS } from '@/data/arts';

const artName = (art: string) => {
  if (art === 'foundation') return '入门基础';
  if (art === 'dao') return '占问之道';
  return ARTS.find(a => a.id === art)?.name || art;
}

export default function AcademyPage() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    const course = courseById(id);
    if (!course) {
      return (
        <div className="wrap page-compact" style={{ paddingTop: 'var(--sp-4)', textAlign: 'center' }}>
          <div className="result-placeholder"><div className="glyph">佚</div><p>课程未寻得 · 请返学馆再择</p></div>
          <div className="mt-4"><Link className="btn-seal btn-ghost" to="/academy">返 学 馆</Link></div>
        </div>
      );
    }
    return <CourseDetail course={course} />;
  }

  const groups = ['foundation', 'dao', ...ARTS.map(a => a.id)];
  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)' }}>
      <div className="section-eyebrow">学馆 · Academy</div>
      <h2 className="section-title" style={{ marginTop: '.8rem' }}>观微学馆</h2>
      <p className="section-note">入门基础 · 各术入门 · 占问之道，循序渐进。共 {COURSES.length} 门课程。</p>
      {groups.map(g => {
        const list = COURSES.filter(c => c.art === g);
        if (!list.length) return null;
        return (
          <div key={g} className="mt-5">
            <h3 className="tag-cool" style={{ letterSpacing: '.25em', marginBottom: 'var(--sp-2)' }}>{artName(g)}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--sp-3)' }}>
              {list.map(c => (
                <Link key={c.id} to={'/academy/' + c.id} className="result-card" style={{ textDecoration: 'none', display: 'block', marginBottom: 0 }}>
                  <h3>{c.title}</h3>
                  <p className="result-text" style={{ marginTop: 0 }}>{c.summary}</p>
                  <div className="mt-2">
                    <span className="pill">{c.level}</span>
                    <span className="pill cool">{c.chapters.length} 章 · {c.exercises.length} 练</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CourseDetail({ course }: { course: Course }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const check = (i: number) => setChecked(prev => ({ ...prev, [i]: true }));
  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)', maxWidth: 880 }}>
      <Link className="back-link" to="/academy">‹ 返学馆</Link>
      <div className="module-kicker">学馆 · {artName(course.art)}</div>
      <div className="module-title-row">
        <h2 className="module-title"><span className="cn">{course.title}</span>{course.level}</h2>
      </div>
      <p className="module-intro">{course.summary}</p>

      <div className="result-card mt-4">
        <h3>讲义</h3>
        {course.chapters.map((ch, i) => (
          <div key={i} style={{ marginBottom: 'var(--sp-2)' }}>
            <p className="tag-cool"><strong>{i + 1}. {ch.title}</strong></p>
            <p className="result-text">{ch.body}</p>
          </div>
        ))}
      </div>

      {course.exercises.length > 0 && (
        <div className="result-card">
          <h3>小试牛刀</h3>
          {course.exercises.map((ex, i) => {
            const isRight = checked[i] && (answers[i] || '').trim() === ex.answer;
            return (
              <div key={i} style={{ marginBottom: 'var(--sp-3)' }}>
                <p className="result-text"><strong>练习 {i + 1}：</strong>{ex.prompt}</p>
                <div className="btn-row" style={{ gap: '.6rem', marginTop: '.4rem' }}>
                  <input
                    className="input-line"
                    style={{ maxWidth: 320 }}
                    placeholder="书答案于此"
                    value={answers[i] || ''}
                    onChange={e => { setAnswers(prev => ({ ...prev, [i]: e.target.value })); setChecked(prev => ({ ...prev, [i]: false })); }}
                    disabled={checked[i]}
                  />
                  {!checked[i] && <button className="btn-seal" style={{ fontSize: '.8rem', padding: '.35rem 1rem' }} onClick={() => check(i)}>自 检</button>}
                </div>
                {checked[i] && (
                  <p className={"mt-1 " + (isRight ? 'tag-cool' : 'tag-hot')}>
                    <strong>{isRight ? '对 · 甚善' : '未中 · 再思'}　</strong>
                    {isRight ? ex.explain : '参考答案：' + ex.answer + '。' + ex.explain}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {course.relatedClassics.length > 0 && (
        <div className="result-card">
          <h3>延伸典藏</h3>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {course.relatedClassics.map(id2 => {
              const b = classicById(id2);
              return b ? <Link key={id2} className="pill" to={'/classics/' + id2}>{b.title}</Link> : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}