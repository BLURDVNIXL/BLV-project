import React, { useEffect, useSyncExternalStore } from 'react';
import { getItemIconUrl, itemIconsVersion, requestItemIcon, subscribeItemIcons } from '../3d/itemIcons';

interface ItemIconProps {
  itemId: string;
  /** Emoji de secours, affiché tant que la capture 3D n'est pas prête (ou si elle échoue). */
  emoji: string;
  /** Côté de la vignette en px. */
  size?: number;
  className?: string;
}

/** Icône d'un objet : capture de son modèle 3D, avec l'emoji comme secours. */
export const ItemIcon: React.FC<ItemIconProps> = ({ itemId, emoji, size = 28, className = '' }) => {
  useSyncExternalStore(subscribeItemIcons, itemIconsVersion);
  useEffect(() => requestItemIcon(itemId), [itemId]);
  const url = getItemIconUrl(itemId);
  if (url) {
    return <img src={url} alt="" width={size} height={size} draggable={false} className={`shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <span className={`shrink-0 text-center leading-none ${className}`} style={{ fontSize: size * 0.8, width: size, height: size, lineHeight: `${size}px` }} aria-hidden="true">
      {emoji}
    </span>
  );
};
