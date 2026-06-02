<script>
import cloudbase from '@cloudbase/js-sdk';
import adapter from '@cloudbase/adapter-uni-app';

export default {
    globalData: {
        cloudbase: null
    },
    onLaunch: async function() {
        console.log('App Launch');
        
        // 隐藏原生 tabBar，使用自定义 tabBar
        uni.hideTabBar();
        
        // 清除可能存在的旧缓存（每次启动时）
        // 注意：这会导致每次启动都需要重新登录
        // 生产环境应该根据实际需求决定是否清除
        // uni.removeStorageSync('userInfo');
        
        // 注册适配器
        cloudbase.useAdapters(adapter);

        const app = cloudbase.init({
            env: 'scan-price-app-4gpjmpz7dcca4b8e'
        });

        this.globalData.cloudbase = app;

	        // #ifdef H5
	        // H5: skip anonymous auth to avoid CloudBase domain whitelist blocking
	        console.log("H5 Launch - skip anonymous auth");
	        const userInfo = uni.getStorageSync("userInfo");
	        if (userInfo && userInfo.shop_id) {
	            uni.switchTab({ url: "/pages/index/index" });
	        } else {
	            uni.reLaunch({ url: "/pages/login/login" });
	        }
	        // #endif

	        // #ifndef H5
	        try {
	            await app.auth({ persistence: "local" }).anonymousAuthProvider().signIn();
	            console.log("Anonymous auth success");
	            const userInfo2 = uni.getStorageSync("userInfo");
	            if (userInfo2 && userInfo2.shop_id) {
	                uni.switchTab({ url: "/pages/index/index" });
	            } else {
	                uni.reLaunch({ url: "/pages/login/login" });
	            }
	        } catch (err) {
	            console.error("Anonymous auth failed", err);
	            uni.reLaunch({ url: "/pages/login/login" });
	        }
	        // #endif
    },
    onShow: function() {
        console.log('App Show');
    },
    onHide: function() {
        console.log('App Hide');
    }
};
</script>

<style>
/* 全局样式 */
</style	        // #ifdef H5
	        // H5: skip anonymous auth to avoid CloudBase domain whitelist blocking
	        console.log('H5 Launch - skip anonymous auth');
	        const userInfo = uni.getStorageSync('userInfo');
	        if (userInfo && userInfo.shop_id) {
	            uni.switchTab({ url: '/pages/index/index' });
	        } else {
	            uni.reLaunch({ url: '/pages/login/login' });
	        }
	        // #endif

	        // #ifndef H5
	        try {
	            await app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
	            console.log('Anonymous auth success');
	            const userInfo = uni.getStorageSync('userInfo');
	            if (userInfo && userInfo.shop_id) {
	                uni.switchTab({ url: '/pages/index/index' });
	            } else {
	                uni.reLaunch({ url: '/pages/login/login' });
	            }
	        } catch (err) {
	            console.error('Anonymous auth failed', err);
	            uni.reLaunch({ url: '/pages/login/login' });
	        }
	        // #endif    onShow: function() {
        console.log('App Show');
    },
    onHide: function() {
        console.log('App Hide');
    }
};
</script>

<style>
/* 全局样式 */
</style>