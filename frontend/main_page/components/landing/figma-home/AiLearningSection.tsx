import Image from "next/image";

/** A local export of the Figma AI learning section, including the product preview. */
export default function AiLearningSection() {
  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="mx-auto w-full max-w-[120rem] overflow-hidden">
        <Image
          src="/landing/figma-home/ai-learning.png"
          alt="AI-powered personalized learning tools and the DeepBrain learning dashboard"
          width={1920}
          height={1107}
          className="h-auto w-full"
          sizes="(min-width: 1920px) 1920px, 100vw"
        />
      </div>
    </section>
  );
}
