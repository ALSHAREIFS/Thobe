const fs = require('fs');
let code = fs.readFileSync('src/context/ShopContext.tsx', 'utf8');

const replacement = `
  const loadAllData = useCallback(async () => {
    if (!currentShop?.shopId) {
      setEmployees([]);
      return;
    }
    try {
      setLoading(true);
      if (isSuperAdmin || isShop) {
        await fetchEmployeesList();
      }
    } catch (err: any) {
      console.error('Error loading shop employees:', err);
      showToast(err.message || 'تعذر تحميل بيانات الموظفين', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentShop?.shopId, isSuperAdmin, isShop, fetchEmployeesList, showToast]);
`;

const regex = /const loadAllData = useCallback\(async \(\) => \{[\s\S]*?\}, \[currentShop\?\.shopId, isSuperAdmin, isShop, fetchEmployeesList, showToast\]\);/;
code = code.replace(regex, replacement.trim());

fs.writeFileSync('src/context/ShopContext.tsx', code);
