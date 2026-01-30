import React from 'react';
import styles from './layouts.module.css';
import { GameControls, GameTable, GameTopbar } from './GameLayoutParts';

type MobileFullscreenLandscapeLayoutProps = {
  onExitFullscreen?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export function MobileFullscreenLandscapeLayout({
  onExitFullscreen,
}: MobileFullscreenLandscapeLayoutProps): JSX.Element {
  return (
    <div className={`${styles.layoutRoot} ${styles.fullscreenLayout}`}>
      <GameTopbar showExitButton onExitFullscreen={onExitFullscreen} />
      <div className={`layout ${styles.fullscreenBody}`}>
        <div className={styles.fullscreenMedia}>
          <div className="table-wrapper">
            <GameTable />
          </div>
        </div>
        <div className={styles.fullscreenSidebar}>
          <GameControls />
        </div>
      </div>
    </div>
  );
}
