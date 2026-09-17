const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const replacement = `
      // Parallelize critical startup queries
      const [isSuper, resolvedShop, rawProfile, userReq] = await Promise.all([
        TailorService.checkIsSuperAdmin(user.uid, user.email),
        TailorService.getShopByOwner(user.uid).catch((err) => {
          console.warn('Could not check shop by ownerUid:', err);
          return null;
        }),
        TailorService.getUserProfile(user.uid).catch((err) => {
          console.warn('Could not check user profile:', err);
          return null;
        }),
        TailorService.getShopRequestByUser(user.uid, user.email).catch((err) => {
          console.warn('Could not check user shop request:', err);
          return null;
        })
      ]);

      setIsSuperAdmin(isSuper);
      if (isSuper) {
        // Bootstrap platform admin records if needed (Fire and forget to not block startup)
        TailorService.bootstrapPlatformOwner({
          uid: user.uid,
          email: user.email || 'abdallahshareif11al@gmail.com',
          fullName: user.displayName || 'مدير منصة ثوبي',
        }).catch(console.error);
        setPlatformViewMode('platform');
      }

      let resolvedProfile = null;

      // C. If user is owner of a shop (Strictly ownerUid === user.uid):
      if (resolvedShop && resolvedShop.ownerUid === user.uid) {
        // The user IS the verified Shop Owner
        resolvedProfile = await TailorService.ensureShopOwnerProfile(resolvedShop, {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || rawProfile?.fullName,
          phone: rawProfile?.phone,
        });
        setUserShopRequest(null);
        setCurrentUser(resolvedProfile);
        setCurrentShop(resolvedShop);
        setLoading(false);
        return;
      }

      // D. If not identified as owner via getShopByOwner, check if rawProfile has shopId:
      if (rawProfile?.shopId) {
        try {
          const shop = await TailorService.getShop(rawProfile.shopId);
          // Check if this shop designates this user as owner strictly by ownerUid
          if (shop && shop.ownerUid === user.uid) {
            resolvedProfile = await TailorService.ensureShopOwnerProfile(shop, {
              uid: user.uid,
              email: user.email,
              fullName: rawProfile.fullName || user.displayName,
              phone: rawProfile.phone,
            });
            setUserShopRequest(null);
            setCurrentUser(resolvedProfile);
            setCurrentShop(shop);
            setLoading(false);
            return;
          }

          // Otherwise, user is an employee in this shop
          const memberDoc = await TailorService.getShopMember(rawProfile.shopId, user.uid);
          if (memberDoc && memberDoc.isActive) {
            resolvedProfile = {
              ...rawProfile,
              ...memberDoc,
              role: 'EMPLOYEE',
            };
            setUserShopRequest(null);
            setCurrentUser(resolvedProfile);
            setCurrentShop(shop);
            setLoading(false);
            return;
          } else {
            console.warn('User has inactive or missing employee membership document');
            setUserShopRequest(null);
            setCurrentUser(rawProfile);
            setCurrentShop(shop);
            setLoading(false);
            return;
          }
        } catch (shopErr) {
          console.warn('Could not load shop for member:', shopErr);
        }
      }

      setUserShopRequest(userReq);

      // F. Fallback for Super Admin or basic user
      if (isSuper) {
        const superProfile = {
          userId: user.uid,
          uid: user.uid,
          shopId: '',
          fullName: user.displayName || 'مدير منصة ثوبي (Super Admin)',
          email: user.email || '',
          role: 'SUPER_ADMIN',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(superProfile);
        setCurrentShop(null);
      } else if (rawProfile) {
        setCurrentUser(rawProfile);
        setCurrentShop(null);
      } else {
        setCurrentUser(null);
        setCurrentShop(null);
      }
`;

const regex = /\/\/ 1\. Check if user is Super Admin[\s\S]*?(?=\} catch \(err: any\))/;
code = code.replace(regex, replacement.trim() + "\n    ");

fs.writeFileSync('src/context/AuthContext.tsx', code);
