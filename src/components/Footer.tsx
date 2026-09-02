import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-900 text-sm font-semibold">&copy; 2023 KAABiL Lab, Utah State University</p>

        <div className="flex items-center space-x-6 flex-wrap justify-center">
          <a href="https://bioinfo.usu.edu" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <Image src="/assets/images/lab_logo_red.png" alt="KAABiL Lab" width={133} height={40} className="h-10 w-auto object-contain" />
          </a>
          <a href="https://usu.edu" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <Image src="/assets/images/usulogo2.png" alt="Utah State University" width={129} height={40} className="h-10 w-auto object-contain" />
          </a>
          <a href="https://psc.usu.edu" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <Image src="/assets/images/PSC_NoTower_Blue.png" alt="USU PSC Department" width={209} height={40} className="h-10 w-auto object-contain" />
          </a>
        </div>
      </div>
    </footer>
  );
}
