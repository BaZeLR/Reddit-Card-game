import React from 'react';
import styles from './layouts.module.css';
import { GameControls, GameTable, GameTopbar } from './GameLayoutParts';

export function SubredditFeedDesktopLayout(): JSX.Element {
  return (
    <div className={`${styles.layoutRoot} ${styles.desktopLayout}`}>
      <GameTopbar />
      <div className={`layout ${styles.desktopBody}`}>
        <div className="table-wrapper">
          <GameTable />
        </div>
        <GameControls />
      </div>
    </div>
  );
}
