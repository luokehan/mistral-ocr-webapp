'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

interface WeatherBackgroundProps {
  initialSeason?: SeasonType;
}

// 创建不进行服务器端渲染的组件
function WeatherBackgroundClient({ initialSeason = 'spring' }: WeatherBackgroundProps) {
  const [season, setSeason] = useState<SeasonType>(initialSeason);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 性能优化 - 减少移动设备上的动画元素数量和复杂度
  const getElementCount = (type: string): number => {
    if (isMobile) {
      // 移动设备上减少粒子数量
      switch (type) {
        case 'cloud': return 4;
        case 'blossom': return 30;
        case 'leaf': return 25;
        case 'rain': return 40;
        case 'puddle': return 3;
        case 'sunflare': return 4;
        case 'snowflake': return 40;
        case 'butterfly': return 5;
        case 'firefly': return 20;
        default: return 10;
      }
    } else {
      // 根据设备性能进行调整
      const performanceLevel = window.navigator.hardwareConcurrency || 4;
      const isHighEnd = performanceLevel >= 8;
      
      switch (type) {
        case 'cloud': return isHighEnd ? 10 : 6;
        case 'blossom': return isHighEnd ? 80 : 40;
        case 'leaf': return isHighEnd ? 60 : 35;
        case 'rain': return isHighEnd ? 100 : 60;
        case 'puddle': return isHighEnd ? 10 : 6;
        case 'sunflare': return isHighEnd ? 10 : 6;
        case 'snowflake': return isHighEnd ? 100 : 60;
        case 'butterfly': return isHighEnd ? 10 : 6;
        case 'firefly': return isHighEnd ? 50 : 30;
        default: return isHighEnd ? 20 : 12;
      }
    }
  };

  // 自动切换季节效果
  useEffect(() => {
    const seasons: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];
    const interval = setInterval(() => {
      setSeason(prev => {
        const currentIndex = seasons.indexOf(prev);
        const nextIndex = (currentIndex + 1) % seasons.length;
        return seasons[nextIndex];
      });
    }, 60000); // 每1分钟切换一次
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* 春季 - 樱花和嫩芽 */}
      {season === 'spring' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-morandiPink-100/70 to-morandiGreen-100/60"></div>
          <div className="cloud-container">
            {Array.from({ length: getElementCount('cloud') }).map((_, index) => (
              <div 
                key={`cloud-${index}`} 
                className="cloud"
                style={{
                  top: `${Math.random() * 60}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: 0.6 + Math.random() * 0.3,
                  animation: `float-left-to-right ${30 + Math.random() * 40}s linear infinite`,
                  animationDelay: `-${Math.random() * 30}s`,
                  transform: `scale(${0.6 + Math.random() * 0.5})`,
                  filter: 'blur(1px)',
                }}
              ></div>
            ))}
          </div>
          <div className="blossom-container">
            {Array.from({ length: getElementCount('blossom') }).map((_, index) => (
              <div 
                key={`blossom-${index}`} 
                className="blossom"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animationDuration: `${8 + Math.random() * 12}s`,
                  animationDelay: `-${Math.random() * 5}s`,
                  opacity: 0.7 + Math.random() * 0.3,
                  fontSize: `${10 + Math.random() * 8}px`,
                }}
              >
                🌸
              </div>
            ))}
          </div>
          {Array.from({ length: getElementCount('butterfly') }).map((_, index) => (
            <div 
              key={`butterfly-${index}`} 
              className="butterfly"
              style={{
                top: `${30 + Math.random() * 50}%`,
                left: `${Math.random() * 100}%`,
                fontSize: `${14 + Math.random() * 8}px`,
                opacity: 0.7 + Math.random() * 0.3,
                animationDuration: `${10 + Math.random() * 20}s`,
                animationDelay: `-${Math.random() * 10}s`,
              }}
            >
              🦋
            </div>
          ))}
        </>
      )}

      {/* 夏季 - 强烈阳光和萤火虫 */}
      {season === 'summer' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/60 via-morandiGreen-100/40 to-morandiBlue-100/50"></div>
          <div className="sun-container summer-sun">
            <div className="sun"></div>
            <div className="sun-rays"></div>
          </div>
          {Array.from({ length: getElementCount('sunflare') * 2 }).map((_, index) => (
            <div 
              key={`sunflare-${index}`} 
              className="sun-flare"
              style={{
                top: `${10 + Math.random() * 70}%`,
                left: `${10 + Math.random() * 80}%`,
                width: `${40 + Math.random() * 60}px`,
                height: `${40 + Math.random() * 60}px`,
                opacity: 0.2 + Math.random() * 0.2,
                animationDuration: `${8 + Math.random() * 12}s`,
                animationDelay: `-${Math.random() * 8}s`,
              }}
            ></div>
          ))}
          <div className="firefly-container">
            {Array.from({ length: getElementCount('firefly') * 2 }).map((_, index) => (
              <div 
                key={`firefly-${index}`} 
                className="firefly"
                style={{
                  top: `${50 + Math.random() * 40}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: 0.5 + Math.random() * 0.5,
                  animationDuration: `${4 + Math.random() * 6}s`,
                  animationDelay: `-${Math.random() * 4}s`,
                }}
              ></div>
            ))}
          </div>
        </>
      )}

      {/* 秋季 - 落叶和淡雨 */}
      {season === 'autumn' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-morandiOrange-200/50 to-morandiRed-200/40"></div>
          <div className="leaf-container">
            {Array.from({ length: getElementCount('leaf') }).map((_, index) => (
              <div 
                key={`leaf-${index}`} 
                className="leaf"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animationDuration: `${10 + Math.random() * 15}s`,
                  animationDelay: `-${Math.random() * 10}s`,
                  opacity: 0.8 + Math.random() * 0.2,
                  fontSize: `${12 + Math.random() * 10}px`,
                  filter: `hue-rotate(${Math.random() * 50}deg)`,
                }}
              >
                {Math.random() > 0.5 ? '🍂' : '🍁'}
              </div>
            ))}
          </div>
          <div className="rain-container autumn-rain">
            {Array.from({ length: getElementCount('rain') }).map((_, index) => (
              <div 
                key={`raindrop-${index}`} 
                className="raindrop"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${1 + Math.random() * 1}s`,
                  animationDelay: `-${Math.random()}s`,
                  opacity: 0.3 + Math.random() * 0.3,
                  height: `${25 + Math.random() * 10}px`,
                }}
              ></div>
            ))}
          </div>
          <div className="puddle-container">
            {Array.from({ length: getElementCount('puddle') * 2 }).map((_, index) => (
              <div 
                key={`puddle-${index}`} 
                className="puddle"
                style={{
                  left: `${Math.random() * 100}%`,
                  bottom: `${Math.random() * 10}%`,
                  transform: `scale(${0.8 + Math.random() * 0.7})`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  animationDelay: `-${Math.random() * 2}s`,
                  opacity: 0.3 + Math.random() * 0.3,
                  width: `${60 + Math.random() * 40}px`,
                  height: `${6 + Math.random() * 4}px`,
                }}
              ></div>
            ))}
          </div>
        </>
      )}

      {/* 冬季 - 雪花和雾气 */}
      {season === 'winter' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-morandi-200/70 to-white/50"></div>
          <div className="snowflake-container">
            {Array.from({ length: getElementCount('snowflake') }).map((_, index) => (
              <div 
                key={`snowflake-${index}`} 
                className="snowflake"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${5 + Math.random() * 10}s`,
                  animationDelay: `-${Math.random() * 5}s`,
                  opacity: 0.8 + Math.random() * 0.2,
                  fontSize: `${12 + Math.random() * 12}px`,
                }}
              >
                ❄
              </div>
            ))}
          </div>
          <div className="fog-container">
            {Array.from({ length: 8 }).map((_, index) => (
              <div 
                key={`fog-${index}`} 
                className="fog"
                style={{
                  top: `${15 * index}%`,
                  left: `${(index % 2) * -50}%`,
                  animationDuration: `${30 + Math.random() * 20}s`,
                  animationDelay: `-${Math.random() * 30}s`,
                  opacity: 0.2 + Math.random() * 0.15,
                  height: `${30 + Math.random() * 20}px`,
                }}
              ></div>
            ))}
          </div>
          <div className="snow-ground"></div>
        </>
      )}

      <style jsx>{`
        /* 云 */
        .cloud-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 2;
        }
        .cloud {
          position: absolute;
          width: 200px;
          height: 60px;
          background: white;
          border-radius: 200px;
          z-index: 2;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        }
        .cloud:before {
          content: '';
          position: absolute;
          top: -30px;
          left: 40px;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: white;
        }
        .cloud:after {
          content: '';
          position: absolute;
          top: -40px;
          right: 40px;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: white;
        }
        .float-left-to-right {
          animation: float-left-to-right linear infinite;
        }
        @keyframes float-left-to-right {
          0% { transform: translateX(-300px) translateY(0); }
          100% { transform: translateX(calc(100vw + 300px)) translateY(20px); }
        }

        /* 樱花飘落 */
        .blossom-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 3;
        }
        .blossom {
          position: absolute;
          animation: blossom-fall linear infinite;
          filter: drop-shadow(0 0 2px rgba(255, 192, 203, 0.5));
        }
        @keyframes blossom-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(100vh) translateX(100px) rotate(360deg); opacity: 0.2; }
        }
        
        /* 蝴蝶 */
        .butterfly {
          position: absolute;
          animation: butterfly-float ease-in-out infinite alternate;
          z-index: 3;
          filter: drop-shadow(0 0 3px rgba(130, 200, 255, 0.7));
        }
        @keyframes butterfly-float {
          0% { transform: translateX(0) translateY(0) rotate(5deg); }
          25% { transform: translateX(50px) translateY(-20px) rotate(-5deg); }
          50% { transform: translateX(100px) translateY(0) rotate(5deg); }
          75% { transform: translateX(50px) translateY(20px) rotate(-5deg); }
          100% { transform: translateX(0) translateY(0) rotate(5deg); }
        }

        /* 阳光 */
        .sun-container {
          position: absolute;
          top: 15%;
          right: 15%; 
          width: 100px;
          height: 100px;
          z-index: 2;
        }
        .summer-sun {
          top: 10%;
          right: 10%;
          transform: scale(1.3);
        }
        .sun {
          position: absolute;
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(255,236,166,1) 0%, rgba(255,198,94,1) 100%);
          border-radius: 50%;
          box-shadow: 0 0 70px rgba(255, 210, 76, 0.7), 0 0 120px rgba(255, 210, 76, 0.4);
          animation: sun-pulse 5s ease-in-out infinite;
        }
        .sun-rays {
          position: absolute;
          top: -40px;
          left: -40px;
          width: 160px;
          height: 160px;
          background: radial-gradient(circle, rgba(255,236,166,0.6) 0%, rgba(255,210,76,0) 70%);
          border-radius: 50%;
          animation: sun-rays 10s linear infinite;
        }
        .sun-flare {
          position: absolute;
          background: radial-gradient(circle, rgba(255,236,166,0.6) 0%, rgba(255,210,76,0) 70%);
          border-radius: 50%;
          animation: sun-flare ease-in-out infinite;
          z-index: 1;
        }
        @keyframes sun-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes sun-rays {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sun-flare {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.5; }
        }
        
        /* 萤火虫 */
        .firefly-container {
          position: absolute;
          width: 100%;
          height: 100%;
          bottom: 0;
          overflow: hidden;
          z-index: 3;
        }
        .firefly {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #ffff99;
          border-radius: 50%;
          box-shadow: 0 0 10px #ffff99, 0 0 15px #ffff99;
          animation: firefly ease-in-out infinite alternate;
        }
        @keyframes firefly {
          0% { transform: translateX(0) translateY(0); opacity: 0.3; }
          50% { opacity: 1; }
          100% { transform: translateX(100px) translateY(-50px); opacity: 0.3; }
        }
        
        /* 落叶 */
        .leaf-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 3;
        }
        .leaf {
          position: absolute;
          animation: leaf-fall linear infinite;
          filter: drop-shadow(0 0 3px rgba(210, 140, 60, 0.6));
        }
        @keyframes leaf-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(100vh) translateX(150px) rotate(720deg); opacity: 0.4; }
        }

        /* 雨 */
        .rain-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 2;
        }
        .autumn-rain .raindrop {
          opacity: 0.4 !important;
          width: 1.5px !important;
        }
        .raindrop {
          position: absolute;
          top: -20px;
          width: 2px;
          height: 20px;
          background: linear-gradient(to bottom, transparent, #a0d8ef);
          animation: rainfall linear infinite;
          box-shadow: 0 0 3px rgba(160, 216, 239, 0.7);
        }
        @keyframes rainfall {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 0.7; }
          100% { transform: translateY(100vh) translateX(20px); opacity: 0; }
        }
        .puddle-container {
          position: absolute;
          width: 100%;
          height: 50px;
          bottom: 0;
          overflow: hidden;
          z-index: 2;
        }
        .puddle {
          position: absolute;
          width: 40px;
          height: 4px;
          background: rgba(160, 216, 239, 0.5);
          border-radius: 50%;
          animation: puddle-ripple ease-in-out infinite;
          box-shadow: 0 0 5px rgba(160, 216, 239, 0.4);
        }
        @keyframes puddle-ripple {
          0% { transform: scale(0.5); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        /* 雪 */
        .snowflake-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 3;
        }
        .snowflake {
          position: absolute;
          top: -20px;
          color: white;
          animation: snowfall linear infinite;
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.7));
        }
        @keyframes snowfall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(100vh) translateX(100px) rotate(360deg); opacity: 0.3; }
        }
        .snow-ground {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 60px;
          background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 100%);
          z-index: 2;
        }
        
        /* 雾 */
        .fog-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 2;
        }
        .fog {
          position: absolute;
          width: 200%;
          height: 40px;
          background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.8) 40%, rgba(255,255,255,0.8) 60%, transparent 100%);
          filter: blur(20px);
          animation: fog-move linear infinite;
        }
        @keyframes fog-move {
          0% { transform: translateX(-200px); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }
        
        /* 移动端适配 */
        @media (max-width: 768px) {
          .sun-container {
            transform: scale(0.8);
          }
          .summer-sun {
            transform: scale(1.1);
          }
          .cloud {
            transform: scale(0.7) !important;
            animation-duration: 60s !important; /* 确保在移动端有动画 */
          }
          @keyframes float-left-to-right {
            0% { transform: translateX(-200px) translateY(0) scale(0.7); }
            100% { transform: translateX(100vw) translateY(10px) scale(0.7); }
          }
          .raindrop {
            height: 18px;
          }
        }
      `}</style>
    </div>
  );
}

// 使用dynamic导入组件，禁用SSR
const WeatherBackground = dynamic(() => Promise.resolve(WeatherBackgroundClient), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gradient-to-b from-morandiPink-50/30 to-morandiGreen-50/30 z-0"></div>
});

export default WeatherBackground; 