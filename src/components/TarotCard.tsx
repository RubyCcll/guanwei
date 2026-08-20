import { useState } from 'react';
import type { TarotCard as TarotCardType } from '@/types';

interface TarotCardProps {
  card: TarotCardType;
  isReversed?: boolean;
  isFlipped?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-20 h-32',
  md: 'w-32 h-48',
  lg: 'w-44 h-72',
};

export default function TarotCard({
  card,
  isReversed = false,
  isFlipped = false,
  onClick,
  size = 'md',
  className = '',
}: TarotCardProps) {
  const [flipped, setFlipped] = useState(isFlipped);

  const handleClick = () => {
    if (!flipped) {
      setFlipped(true);
    }
    onClick?.();
  };

  const suitSymbol = {
    wands: '⚡',
    cups: '🏆',
    swords: '⚔️',
    pentacles: '💰',
  };

  const elementColor = {
    wands: 'text-orange-400',
    cups: 'text-blue-400',
    swords: 'text-gray-300',
    pentacles: 'text-green-400',
  };

  return (
    <div
      className={`relative perspective-1000 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div
        className={`relative preserve-3d transition-transform duration-700 ${
          flipped ? 'rotate-y-180' : ''
        } ${sizeClasses[size]}`}
      >
        {/* Card Back */}
        <div className="absolute inset-0 backface-hidden rounded-lg border-2 border-ancient/40 bg-abyss overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full p-2">
              <div className="w-full h-full border border-ancient/30 rounded flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border border-ancient/50 rotate-45" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-ancient/60 text-2xl">✦</span>
                </div>
                <div className="absolute top-1 left-1 text-ancient/30 text-xs">⚜</div>
                <div className="absolute top-1 right-1 text-ancient/30 text-xs">⚜</div>
                <div className="absolute bottom-1 left-1 text-ancient/30 text-xs">⚜</div>
                <div className="absolute bottom-1 right-1 text-ancient/30 text-xs">⚜</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Front */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-lg border-2 ${
            isReversed ? 'border-crimson/60' : 'border-ancient/60'
          } bg-abyss overflow-hidden`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-between p-2">
            {/* Top */}
            <div className="w-full flex justify-between items-start">
              <span className={`text-xs ${card.suit ? elementColor[card.suit] : 'text-ancient'}`}>
                {card.number || (card.arcana === 'major' ? '∞' : '')}
              </span>
              {card.suit && (
                <span className="text-xs">{suitSymbol[card.suit]}</span>
              )}
            </div>

            {/* Center */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-1">
                  {card.arcana === 'major' ? '☽' : suitSymbol[card.suit as keyof typeof suitSymbol]}
                </div>
                <div className={`text-xs ${isReversed ? 'text-crimson/80' : 'text-ancient'} font-medium`}>
                  {card.name}
                </div>
                {isReversed && (
                  <div className="text-[10px] text-crimson/60 mt-0.5">逆位</div>
                )}
              </div>
            </div>

            {/* Bottom */}
            <div className="w-full flex justify-between items-end">
              <span className="text-[10px] text-stardust/40">
                {card.arcana === 'major' ? '大阿卡纳' : card.suit === 'wands' ? '权杖' : card.suit === 'cups' ? '圣杯' : card.suit === 'swords' ? '宝剑' : '星币'}
              </span>
              <span className={`text-xs ${card.suit ? elementColor[card.suit] : 'text-ancient'}`}>
                {card.number || (card.arcana === 'major' ? '∞' : '')}
              </span>
            </div>
          </div>

          {/* Decorative border */}
          <div className="absolute inset-1 border border-ancient/10 rounded pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
