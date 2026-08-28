import Image from "next/image";

export type AuthPuzzleLayout = "scattered" | "assembled" | "looping";

type AuthPuzzleArtworkProps = {
  layout?: AuthPuzzleLayout;
};

/** Independent puzzle pieces; the layout prop can be animated without replacing one large image. */
export default function AuthPuzzleArtwork({ layout = "scattered" }: AuthPuzzleArtworkProps) {
  return (
    <div className="auth-puzzle-artwork" data-puzzle-layout={layout} aria-hidden="true">
      <div className="auth-puzzle-piece auth-puzzle-piece--green">
        <div className="auth-puzzle-piece__green-asset">
          <Image
            src="/auth/puzzle-pieces/green-piece.svg"
            alt=""
            fill
            sizes="25vw"
            className="auth-puzzle-piece__asset"
          />
        </div>
      </div>

      <div className="auth-puzzle-piece auth-puzzle-piece--pink">
        <div className="auth-puzzle-piece__pink-knob">
          <Image
            src="/auth/puzzle-pieces/pink-knob.svg"
            alt=""
            fill
            sizes="10vw"
            className="auth-puzzle-piece__asset"
          />
        </div>
        <div className="auth-puzzle-piece__pink-square">
          <Image
            src="/auth/puzzle-pieces/pink-grid.svg"
            alt=""
            fill
            sizes="25vw"
            className="auth-puzzle-piece__asset"
          />
        </div>
      </div>

      <div className="auth-puzzle-piece auth-puzzle-piece--yellow">
        <Image
          src="/auth/puzzle-pieces/yellow-group.svg"
          alt=""
          fill
          sizes="25vw"
          className="auth-puzzle-piece__asset auth-puzzle-piece__yellow-group-asset"
        />
      </div>

      <div className="auth-puzzle-piece auth-puzzle-piece--blue">
        <Image
          src="/auth/puzzle-pieces/blue-piece.svg"
          alt=""
          fill
          sizes="25vw"
          className="auth-puzzle-piece__asset"
        />
      </div>
    </div>
  );
}
