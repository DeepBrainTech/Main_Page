/** Figma DBT-home cognitive test tokens (node 582:6452+) */
export const testColors = {
  primary: "#045e96",
  primaryLight: "#edf4fc",
  accent: "#e45c44",
  text: "#045e96",
} as const;

/** Session 1/2/3、Question n/m、Skip Session、Test History */
export const testTypeSession = "text-[18px] leading-5";

/** 测试标题，如 Sternberg Memory Scanning */
export const testTypeTitle = "text-2xl leading-normal";

/** 正文：说明、题目、选项文案等 */
export const testTypeBody = "text-xl leading-8";

/** Intro 主说明段落（20px，与 Figma 一致） */
export const testIntroBodyClass = `test-intro-body ${testTypeBody} text-[#045e96]`;

/** Intro 规则列表（20px，略紧行距，避免多条规则显得过高） */
export const testIntroRulesClass = "test-intro-rules list-disc space-y-1.5 pl-5 text-xl leading-7 text-[#045e96]";

/** Intro 扩展区小标题/图示标注（18px） */
export const testIntroMetaClass = `${testTypeSession} text-[#045e96]`;

/** Start Practice / Start Test 及一般操作按钮 */
export const testTypeCta = "text-base leading-6";

export const testShellClass =
  "w-full rounded-[32px] border border-white/60 bg-white/60 p-6 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] sm:p-8";

export const testInnerPanelClass = `w-full rounded-2xl bg-white/90 p-6 sm:p-10 lg:p-12 ${testTypeBody} text-[#045e96]`;

export const testSessionPillBase = `inline-flex h-12 min-h-12 items-center justify-center rounded-[14px] px-5 font-normal sm:h-[60px] sm:px-6 ${testTypeSession}`;

export const testSessionPillActive = `${testSessionPillBase} bg-[#045e96] text-white`;

export const testSessionPillIdle = `${testSessionPillBase} bg-[#edf4fc] text-[#045e96]`;

export const testSessionPillDone = `${testSessionPillBase} bg-[#edf4fc] text-[#045e96]/80`;

export const testChromeButtonClass = `inline-flex h-12 min-h-12 items-center justify-center rounded-[14px] bg-[#edf4fc] px-5 font-normal text-[#045e96] transition hover:bg-[#dceaf8] sm:h-[60px] sm:px-6 ${testTypeSession}`;

export const testCtaSecondaryClass = `flex flex-1 items-center justify-center rounded-[14px] bg-[#edf4fc] px-6 py-4 font-medium text-[#045e96] transition hover:bg-[#dceaf8] sm:h-[60px] ${testTypeCta}`;

export const testCtaPrimaryClass = `flex flex-1 items-center justify-center rounded-[14px] bg-[#e45c44] px-6 py-4 font-medium text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.2),0px_4px_6px_0px_rgba(228,92,68,0.15)] transition hover:bg-[#d4533d] sm:h-[60px] ${testTypeCta}`;

export const testChoiceButtonClass = `test-answer-btn flex h-16 flex-1 items-center justify-center rounded-[14px] px-6 font-medium transition disabled:opacity-50 sm:h-20 ${testTypeBody}`;

/** 练习/正式 badge */
export const testBadgeClass = `inline-flex w-fit rounded-[14px] bg-[#edf4fc] px-3 py-1.5 font-medium text-[#045e96] ${testTypeSession}`;

/** 进度、提示行（18px） */
export const testMetaClass = testTypeSession;

/** 反馈文案（20px） */
export const testFeedbackClass = `${testTypeBody} font-semibold`;

/** 16px 操作按钮：Start Formal、暂停等 */
export const testActionBtnClass = `inline-flex items-center justify-center rounded-[14px] px-5 py-2.5 font-medium transition ${testTypeCta}`;

export const testActionBtnPrimary = `${testActionBtnClass} bg-[#045e96] text-white hover:bg-[#034a78]`;

export const testActionBtnAccent = `${testActionBtnClass} bg-[#e45c44] text-white hover:bg-[#d4533d]`;

export const testActionBtnSuccess = `${testActionBtnClass} bg-emerald-500 text-white hover:bg-emerald-600`;

export const testActionBtnOutline = `${testActionBtnClass} border border-[#045e96]/25 bg-white text-[#045e96] hover:bg-[#edf4fc]`;

/** 20px 答题/选项按钮 */
export const testAnswerBtnClass = `test-answer-btn inline-flex items-center justify-center rounded-[14px] px-5 py-3 font-medium transition ${testTypeBody}`;

export const testAnswerBtnSelected = `${testAnswerBtnClass} bg-[#045e96] text-white`;

export const testAnswerBtnIdle = `${testAnswerBtnClass} border-2 border-[#045e96]/20 bg-[#edf4fc] text-[#045e96] hover:bg-[#dceaf8]`;
