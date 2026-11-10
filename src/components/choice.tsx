import { asset } from "@/lib/paths";

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="back-btn" onClick={onClick}>
      <img src={asset("/hello/back.png")} alt="" width={18} height={18} />
      Atrás
    </button>
  );
}

export function ChoiceButton({
  title,
  detail,
  onClick,
  badge,
  image,
}: {
  title: string;
  detail?: string;
  badge?: string;
  image?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="ios-choice">
      {image ? <img src={asset(image)} alt="" /> : null}
      <span>
        {title}
        {detail ? <small>{detail}</small> : null}
      </span>
      {badge ? <small>{badge}</small> : null}
    </button>
  );
}
