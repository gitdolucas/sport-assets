import SportBallsDemo from './SportBallsDemo'

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <SportBallsDemo />
      <div className="relative z-10 flex min-h-screen flex-col justify-between px-6 py-8 sm:px-8 md:px-12">
        <h1 className="font-display max-w-2xl text-left text-4xl font-extrabold tracking-tight text-foreground opacity-0 sm:text-5xl md:text-6xl md:leading-[1.05] md:tracking-tighter animate-fade-in-up [text-shadow:0_0_1px_#fff,0_0_2px_#fff,0_0_4px_#fff,0_0_6px_#fff,1px_0_0_#fff,0_1px_0_#fff,-1px_0_0_#fff,0_-1px_0_#fff,1px_1px_0_#fff,-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff]">
          Sport Assets
        </h1>
        <p className="max-w-2xl text-left text-lg font-semibold leading-relaxed text-foreground/90 opacity-0 sm:text-xl animate-fade-in-up-delay [text-shadow:0_0_1px_#fff,0_0_2px_#fff,0_0_4px_#fff,0_0_6px_#fff,1px_0_0_#fff,0_1px_0_#fff,-1px_0_0_#fff,0_-1px_0_#fff,1px_1px_0_#fff,-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff]">
          <span className="block text-foreground/95">
            Physics-based 3D sport ball background — basketball, soccer, volleyball,
            pickleball, tennis.
          </span>
          <span className="mt-1 block text-sm font-medium uppercase tracking-widest text-foreground/60 sm:text-base">
            React Three Fiber · Rapier · Scales 1:1 between each model
          </span>
        </p>
      </div>
    </main>
  )
}
