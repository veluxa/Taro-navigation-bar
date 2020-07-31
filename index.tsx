import _isFunction from 'lodash/isFunction';
import Taro, { useDidShow } from '@tarojs/taro';
import React, { useState } from 'react';

import './index.scss';

interface IReact {
    width: number,
    top: number,
    left: number,
    right: number
    height: number,
    bottom: number
}

interface ISystemInfo extends Taro.getSystemInfoSync.Result {
    navBarExtendHeight: number,
    navBarHeight: number,
    capsulePosition: IReact,
    ios: boolean,
}

interface IProps {
    back?: boolean,
    home?: boolean,
    title?: string,
    color?: string,
    background?: string,
    backgroundColorTop?: string,
    searchBar?: boolean,
    searchText?: string,
    iconTheme?: string,
    extClass?: string,
    delta?: number,
    renderLeft?: JSX.Element,
    renderRight?: JSX.Element,
    renderCenter?: JSX.Element,
    onBack?: () => void,
    onHome?: () => void,
    onSearch?: () => void
}

export const getSystemInfo = () => {
    if ((Taro as any).globalSystemInfo && !(Taro as any).globalSystemInfo.ios) {
        return (Taro as any).globalSystemInfo;
    } else {
        // h5环境下忽略navbar
        if (!_isFunction(Taro.getSystemInfoSync)) {
            return null;
        }
        let systemInfo: any = Taro.getSystemInfoSync()
        let ios = !!(systemInfo.system.toLowerCase().search('ios') + 1);
        let rect: IReact | null;
        try {
            rect = Taro.getMenuButtonBoundingClientRect ? Taro.getMenuButtonBoundingClientRect() : null;
            if (rect === null) {
                throw 'getMenuButtonBoundingClientRect error';
            }
            //取值为0的情况  有可能width不为0 top为0的情况
            if (!rect.width || !rect.top || !rect.left || !rect.height) {
                throw 'getMenuButtonBoundingClientRect error';
            }
        } catch (error) {
            let gap = 0; //胶囊按钮上下间距 使导航内容居中
            let width = 96; //胶囊的宽度
            if (systemInfo.platform === 'android') {
                gap = 8;
                width = 96;
            } else if (systemInfo.platform === 'devtools') {
                if (ios) {
                    gap = 5.5; //开发工具中ios手机
                } else {
                    gap = 7.5; //开发工具中android和其他手机
                }
            } else {
                gap = 4;
                width = 88;
            }
            if (!systemInfo.statusBarHeight) {
                //开启wifi的情况下修复statusBarHeight值获取不到
                systemInfo.statusBarHeight = systemInfo.screenHeight - systemInfo.windowHeight - 20;
            }
            rect = {
                //获取不到胶囊信息就自定义重置一个
                bottom: systemInfo.statusBarHeight + gap + 32,
                height: 32,
                left: systemInfo.windowWidth - width - 10,
                right: systemInfo.windowWidth - 10,
                top: systemInfo.statusBarHeight + gap,
                width: width
            };
            console.log('error', error);
            console.log('rect', rect);
        }

        let navBarHeight = 0;
        if (!systemInfo.statusBarHeight) {
            //开启wifi和打电话下
            systemInfo.statusBarHeight = systemInfo.screenHeight - systemInfo.windowHeight - 20;
            navBarHeight = (function () {
                let gap = rect.top - systemInfo.statusBarHeight;
                return 2 * gap + rect.height;
            })();

            systemInfo.statusBarHeight = 0;
            systemInfo.navBarExtendHeight = 0; //下方扩展4像素高度 防止下方边距太小
        } else {
            navBarHeight = (function () {
                let gap = rect.top - systemInfo.statusBarHeight;
                return systemInfo.statusBarHeight + 2 * gap + rect.height;
            })();
            if (ios) {
                systemInfo.navBarExtendHeight = 4; //下方扩展4像素高度 防止下方边距太小
            } else {
                systemInfo.navBarExtendHeight = 0;
            }
        }

        systemInfo.navBarHeight = navBarHeight; //导航栏高度不包括statusBarHeight
        systemInfo.capsulePosition = rect; //右上角胶囊按钮信息bottom: 58 height: 32 left: 317 right: 404 top: 26 width: 87 目前发现在大多机型都是固定值 为防止不一样所以会使用动态值来计算nav元素大小
        systemInfo.ios = ios; //是否ios
        (Taro as any).globalSystemInfo = systemInfo; //将信息保存到全局变量中,后边再用就不用重新异步获取了
        //console.log('systemInfo', systemInfo);
        return systemInfo;
    }
}

let globalSystemInfo = getSystemInfo();

const NavBar: Taro.FC<IProps> = props => {

    const { back, home, title, color, background, backgroundColorTop, searchBar, searchText, iconTheme, extClass } = props;

    const setStyle = (systemInfo: ISystemInfo) => {

        const { statusBarHeight, navBarHeight, capsulePosition, navBarExtendHeight, ios, windowWidth } = systemInfo;

        let rightDistance = windowWidth - capsulePosition.right; //胶囊按钮右侧到屏幕右侧的边距
        let leftWidth = windowWidth - capsulePosition.left; //胶囊按钮左侧到屏幕右侧的边距

        let navigationbarinnerStyle = {
            color,
            //`background:${background}`,
            height: navBarHeight + navBarExtendHeight,
            paddingTop: statusBarHeight,
            paddingRight: leftWidth,
            paddingBottom: navBarExtendHeight
        };
        let navBarLeft = {};
        if ((back && !home) || (!back && home)) {
            navBarLeft = {
                width: capsulePosition.width,
                height: capsulePosition.height,
                marginLeft: 0,
                marginRight: rightDistance
            };
        } else if ((back && home) || title) {
            navBarLeft = {
                width: capsulePosition.width,
                height: capsulePosition.height,
                marginLeft: rightDistance
            };
        } else {
            navBarLeft = { width: 'auto', marginLeft: 0 };
        }
        return {
            navigationbarinnerStyle,
            navBarLeft,
            navBarHeight,
            capsulePosition,
            navBarExtendHeight,
            ios,
            rightDistance
        };
    }

    const [configStyle, setConfigStyle] = useState(setStyle(globalSystemInfo))

    const {
        navigationbarinnerStyle,
        navBarLeft,
        navBarHeight,
        capsulePosition,
        navBarExtendHeight,
        ios,
        rightDistance
    } = configStyle;

    useDidShow(() => {
        if (globalSystemInfo.ios) {
            globalSystemInfo = getSystemInfo();
            setConfigStyle(setStyle(globalSystemInfo))
        }
    })

    const handleBackClick = () => {
        if (_isFunction(props.onBack)) {
            props.onBack();
        } else {
            const pages = Taro.getCurrentPages();
            if (pages.length >= 2) {
                Taro.navigateBack({
                    delta: props.delta
                });
            }
        }
    }
    const handleGoHomeClick = () => {
        if (_isFunction(props.onHome)) {
            props.onHome();
        }
    }
    const handleSearchClick = () => {
        if (_isFunction(props.onSearch)) {
            props.onSearch();
        }
    }

    let nav_bar__center: any;

    if (title) {
        nav_bar__center = <text>{title}</text>;
    } else if (searchBar) {
        nav_bar__center = (
            <view
                className='nav-bar-search'
                style={{ height: capsulePosition.height }}
                onClick={handleSearchClick}
            >
                <view className='nav-bar-search__icon' />
                <view className='nav-bar-search__input'>{searchText}</view>
            </view>
        );
    } else {
        nav_bar__center = props.renderCenter;
    }

    return (
        <view
            className={`nav-bar ${ios ? 'ios' : 'android'} ${extClass}`}
            style={{
                background: backgroundColorTop ? backgroundColorTop : background,
                height: navBarHeight + navBarExtendHeight
            }}
        >
            <view
                className={`nav-bar__placeholder ${ios ? 'ios' : 'android'}`}
                style={{ paddingTop: navBarHeight + navBarExtendHeight }}
            />
            <view
                className={`nav-bar__inner ${ios ? 'ios' : 'android'}`}
                style={{ background: background, ...navigationbarinnerStyle }}
            >
                <view className='nav-bar__left' style={{ ...navBarLeft }}>
                    {back && !home && (
                        <view
                            onClick={handleBackClick}
                            className={`nav-bar__button nav-bar__btn_goback ${iconTheme}`}
                        />
                    )}
                    {!back && home && (
                        <view
                            onClick={handleGoHomeClick}
                            className={`nav-bar__button nav-bar__btn_gohome ${iconTheme}`}
                        />
                    )}
                    {back && home && (
                        <view className={`nav-bar__buttons ${ios ? 'ios' : 'android'}`}>
                            <view
                                onClick={handleBackClick}
                                className={`nav-bar__button nav-bar__btn_goback ${iconTheme}`}
                            />
                            <view
                                onClick={handleGoHomeClick}
                                className={`nav-bar__button nav-bar__btn_gohome ${iconTheme}}`}
                            />
                        </view>
                    )}
                    {!back && !home && props.renderLeft}
                </view>
                <view className='nav-bar__center' style={{ paddingLeft: rightDistance }}>
                    {nav_bar__center}
                </view>
                <view className='nav-bar__right' style={{ marginRight: rightDistance }}>
                    {props.renderRight}
                </view>
            </view>
        </view >
    )
}

NavBar.options = {
    addGlobalClass: true
};

NavBar.defaultProps = {
    extClass: '',
    background: 'rgba(255,255,255,1)', //导航栏背景
    color: '#000000',
    title: '',
    searchText: '点我搜索',
    searchBar: false,
    back: false,
    home: false,
    iconTheme: 'black',
    delta: 1
};

export default NavBar
