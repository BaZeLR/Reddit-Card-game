import React from 'react';
import styles from './layouts.module.css';
import { GameControls, GameTable, GameTopbar } from './GameLayoutParts';

type MobilePortraitFeedLayoutProps = {
  showRotatePrompt?: boolean;
};

export function MobilePortraitFeedLayout({
  showRotatePrompt,
}: MobilePortraitFeedLayoutProps): JSX.Element {
  return (
    <div className={`${styles.layoutRoot} ${styles.portraitLayout}`}>
      <div className={styles.portraitSystemBar}>
        <GameTopbar />
      </div>
      <div className={styles.portraitTableZone}>
        <div className="table-wrapper">
          <GameTable />
        </div>
      </div>
      <div className={styles.portraitActions}>
        <GameControls />
      </div>

      {showRotatePrompt ? (
        <div className={styles.rotatePrompt} role="dialog" aria-live="polite">
          <div className={styles.rotatePromptCard}>
            <h3 className={styles.rotatePromptTitle}>Rotate for the best view</h3>
            <p className={styles.rotatePromptBody}>
              Rotate to landscape for the best experience.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
