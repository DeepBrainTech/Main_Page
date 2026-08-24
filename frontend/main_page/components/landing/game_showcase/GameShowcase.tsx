import Image from "next/image";

/** Figma-exported game collage. It remains a local image asset so it is stable in production. */
export default function GameShowcase() {
  return (
    <section className="w-full bg-white">
      <div className="aspect-[2/1] w-full overflow-hidden">
        <Image
          src="/landing/game_showcase/game-mosaic.png"
          alt="Colorful DeepBrain game pieces and game board collage"
          width={3840}
          height={1920}
          className="h-auto w-full"
          sizes="100vw"
        />
      </div>
    </section>
  );
}
