import Image from "next/image";

/** Figma-exported game collage. It remains a local image asset so it is stable in production. */
export default function GameShowcase() {
  return (
    <section className="w-full bg-white">
      <div className="mx-auto aspect-[25/12] w-full max-w-[120rem] overflow-hidden">
        <Image
          src="/landing/figma-home/game-mosaic.png"
          alt="Colorful DeepBrain game pieces and game board collage"
          width={2000}
          height={1120}
          className="h-auto w-full"
          sizes="100vw"
        />
      </div>
    </section>
  );
}
