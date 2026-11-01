/**
 * The last line of defence against a blank page (017 hardening, US2).
 *
 * A lazy page whose chunk cannot be fetched, or any render that throws, would
 * otherwise unmount the whole tree and leave an empty body. This shows the
 * header, an alert that says something did not load, and two ways forward: a
 * reload (which refetches the chunk) and the start page.
 */
import { Component } from "react";
import type { ErrorInfo, JSX, ReactNode } from "react";
import { t } from "../i18n/index.ts";
import SiteHeader from "./SiteHeader.tsx";

interface Props {
  children: ReactNode;
  /** When this changes the boundary tries its children again (the address moved on). */
  resetKey: string;
}

interface State {
  failed: boolean;
  resetKey: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <Failure />;
  }
}

function Failure(): JSX.Element {
  return (
    <div className="atlas-page">
      <SiteHeader />
      <main className="atlas-main">
        <div className="atlas-empty" role="alert">
          <p className="font-display text-3xl">{t("site.error.title")}</p>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-text-muted">
            {t("site.error.body")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="atlas-btn"
              onClick={() => {
                window.location.reload();
              }}
            >
              {t("site.error.reload")}
            </button>
            <a className="atlas-btn" href="#/">
              {t("site.error.start")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
