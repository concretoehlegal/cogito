import { IconEye } from './icons';

/** Faixa superior da janela (área de arrastar), com o nome do aplicativo. */
export function TitleStrip({ book }: { book?: string }) {
  return (
    <header className="titlestrip">
      <span className="strip-name">COGITO</span>
      {book && <span className="strip-book">{book}</span>}
    </header>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return <IconEye size={size} />;
}
