/**
 * Landing 页面背景装饰层
 * 仅负责视觉氛围，不承载业务交互
 */
export default function DecorativeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#d8e2ee]" />

      <div className="absolute left-1/2 top-[34%] h-96 w-[130%] -translate-x-1/2 rounded-[50%] bg-white/25" />
      <div className="absolute left-1/2 top-[60%] h-96 w-[130%] -translate-x-1/2 rounded-[50%] bg-white/20" />

      <div className="absolute left-0 right-0 top-0 h-28 bg-gradient-to-b from-white/40 to-transparent" />

    </div>
  );
}
