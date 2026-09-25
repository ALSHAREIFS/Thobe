const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const timeoutCode = `
  const [startupTimeout, setStartupTimeout] = useState(false);
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setStartupTimeout(true);
      }, 15000); // 15 seconds timeout
      return () => clearTimeout(timer);
    } else {
      setStartupTimeout(false);
    }
  }, [loading]);

  if (loading) {
    if (startupTimeout) {
      return (
        <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
          <div className="w-14 h-14 rounded-2xl bg-red-900/40 border border-red-500/40 flex items-center justify-center mb-4 shadow-xl">
            <Scissors className="w-7 h-7 text-red-400" />
          </div>
          <div className="font-black text-base text-slate-200">منصة ثوبي السحابية</div>
          <div className="text-sm text-red-400 mt-2 font-bold">تعذر إكمال الاتصال بالخادم</div>
          <p className="text-xs text-slate-400 mt-1 mb-6">يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#1A365D] hover:bg-blue-800 text-white font-bold rounded-xl transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return (
`;

code = code.replace(
  "  if (loading) {\n    return (",
  timeoutCode
);

fs.writeFileSync('src/App.tsx', code);
