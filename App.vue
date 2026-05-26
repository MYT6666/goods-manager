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

        // 关键修复：先完成匿名登录，再决定跳转
        try {
            await app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
            console.log('✅ 匿名登录成功');
            
            // 登录成功后，检查本地用户信息
            const userInfo = uni.getStorageSync('userInfo');
            console.log('App Launch - 本地用户信息:', userInfo);
            
            if (userInfo && userInfo.shop_id) {
                console.log('App Launch - 本地已有用户信息，跳转到首页:', {
                    username: userInfo.username,
                    shop_id: userInfo.shop_id
                });
                // 使用 switchTab 跳转到 tabBar 页面
                uni.switchTab({
                    url: '/pages/index/index'
                });
            } else {
                console.log('App Launch - 本地无用户信息，跳转到登录页');
                uni.reLaunch({
                    url: '/pages/login/login'
                });
            }
        } catch (err) {
            console.error('❌ 匿名登录失败', err);
            // 匿名登录失败不阻止页面显示，让用户可以正常登录
            console.log('App Launch - 匿名登录失败，继续跳转到登录页');
            uni.reLaunch({
                url: '/pages/login/login'
            });
        }
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
</style>