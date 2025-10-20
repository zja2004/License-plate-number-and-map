// 初始化地图
const mapContainer = document.getElementById('map');
const myChart = echarts.init(mapContainer);

// 省份代码映射
const provinceCode = {
    '北京': '110000',
    '天津': '120000',
    '河北': '130000',
    '山西': '140000',
    '内蒙古': '150000',
    '辽宁': '210000',
    '吉林': '220000',
    '黑龙江': '230000',
    '上海': '310000',
    '江苏': '320000',
    '浙江': '330000',
    '安徽': '340000',
    '福建': '350000',
    '江西': '360000',
    '山东': '370000',
    '河南': '410000',
    '湖北': '420000',
    '湖南': '430000',
    '广东': '440000',
    '广西': '450000',
    '海南': '460000',
    '重庆': '500000',
    '四川': '510000',
    '贵州': '520000',
    '云南': '530000',
    '西藏': '540000',
    '陕西': '610000',
    '甘肃': '620000',
    '青海': '630000',
    '宁夏': '640000',
    '新疆': '650000',
    '台湾': '710000',
    '香港': '810000',
    '澳门': '820000'
};

// 准备地图数据
const mapData = [];
for (let city in licensePlateData) {
    mapData.push({
        name: city,
        value: Math.random() * 100 + 50,
        plate: licensePlateData[city]
    });
}

// 加载所有省份的市级地图数据
async function loadAllProvinceMaps() {
    const allFeatures = [];

    // 显示加载提示
    myChart.showLoading({
        text: '正在加载地图数据...',
        color: '#667eea',
        textColor: '#000',
        maskColor: 'rgba(255, 255, 255, 0.8)',
        zlevel: 0
    });

    try {
        // 加载所有省份的地图数据
        const promises = Object.entries(provinceCode).map(async ([province, code]) => {
            try {
                const response = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`);
                const data = await response.json();
                return data.features;
            } catch (error) {
                console.warn(`加载 ${province} 地图数据失败:`, error);
                return [];
            }
        });

        const results = await Promise.all(promises);

        // 合并所有特征
        results.forEach(features => {
            if (features && Array.isArray(features)) {
                allFeatures.push(...features);
            }
        });

        // 创建完整的 GeoJSON
        const chinaGeoJson = {
            type: 'FeatureCollection',
            features: allFeatures
        };

        // 注册地图
        echarts.registerMap('china', chinaGeoJson);

        // 隐藏加载提示
        myChart.hideLoading();

        // 配置地图选项
        const option = {
            backgroundColor: '#f5f5f5',
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    const name = params.name;
                    let plate = licensePlateData[name];

                    // 尝试去掉后缀匹配
                    if (!plate) {
                        const simpleName = name.replace(/(市|省|自治区|特别行政区|自治州|地区|盟)$/g, '');
                        plate = licensePlateData[simpleName];
                    }

                    if (plate) {
                        return `<div style="padding: 5px;">
                            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${name}</div>
                            <div style="color: #4fc3f7; font-size: 18px; font-weight: bold;">车牌: ${plate}</div>
                        </div>`;
                    }
                    return `<div style="padding: 5px;">
                        <div style="font-weight: bold; font-size: 16px;">${name}</div>
                    </div>`;
                },
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#333',
                borderWidth: 0,
                textStyle: {
                    color: '#fff',
                    fontSize: 14
                },
                padding: 15
            },
            visualMap: {
                show: false,
                min: 0,
                max: 200,
                inRange: {
                    color: ['#e0f3ff', '#b3d9ff', '#66b3ff', '#3399ff', '#0080ff']
                }
            },
            series: [
                {
                    name: '车牌号',
                    type: 'map',
                    map: 'china',
                    roam: true,
                    scaleLimit: {
                        min: 0.8,
                        max: 20
                    },
                    zoom: 1.2,
                    label: {
                        show: true,
                        color: '#333',
                        fontSize: 8,
                        fontWeight: 'normal'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            areaColor: '#ffa726',
                            borderColor: '#ff6f00',
                            borderWidth: 2,
                            shadowBlur: 15,
                            shadowColor: 'rgba(255, 167, 38, 0.5)'
                        }
                    },
                    itemStyle: {
                        borderColor: '#0066cc',
                        borderWidth: 0.8,
                        shadowBlur: 5,
                        shadowColor: 'rgba(0, 0, 0, 0.1)'
                    },
                    data: mapData
                }
            ]
        };

        // 设置配置并渲染
        myChart.setOption(option);

        // 点击事件处理
        myChart.on('click', function(params) {
            if (params.componentType === 'series') {
                let cityName = params.name;
                let plateNumber = licensePlateData[cityName];

                // 如果直接找不到，尝试去掉后缀
                if (!plateNumber) {
                    const simpleName = cityName.replace(/(市|省|自治区|特别行政区|自治州|地区|盟)$/g, '');
                    plateNumber = licensePlateData[simpleName];
                    if (plateNumber) {
                        cityName = simpleName;
                    }
                }

                if (plateNumber) {
                    showModal(cityName, plateNumber);
                } else {
                    console.log(`未找到 ${params.name} 的车牌信息`);
                }
            }
        });

        // 响应式处理
        window.addEventListener('resize', function() {
            myChart.resize();
        });

    } catch (error) {
        myChart.hideLoading();
        console.error('加载地图数据失败:', error);
        alert('地图数据加载失败，请检查网络连接');
    }
}

// 加载地图
loadAllProvinceMaps();

// 显示模态弹窗
function showModal(cityName, plateNumber) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>${cityName}</h2>
            <div class="plate-display">${plateNumber}</div>
            <p class="modal-info">点击任意位置或按 ESC 键关闭</p>
        </div>
    `;

    document.body.appendChild(modal);

    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal {
                display: block;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                animation: fadeIn 0.3s;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .modal-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 10% auto;
                padding: 40px;
                border-radius: 15px;
                width: 80%;
                max-width: 500px;
                text-align: center;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s;
            }

            .modal-content h2 {
                color: white;
                font-size: 32px;
                margin-bottom: 30px;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }

            .plate-display {
                background: white;
                color: #333;
                padding: 20px 30px;
                border-radius: 10px;
                font-size: 36px;
                font-weight: bold;
                margin: 20px 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                letter-spacing: 3px;
                border: 3px solid #0066cc;
            }

            .modal-info {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                margin-top: 20px;
            }

            .close {
                color: white;
                position: absolute;
                right: 20px;
                top: 15px;
                font-size: 35px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }

            .close:hover,
            .close:focus {
                color: #ffeb3b;
                transform: rotate(90deg);
            }
        `;
        document.head.appendChild(style);
    }

    function closeModal() {
        modal.style.animation = 'fadeIn 0.3s reverse';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = closeModal;

    modal.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    const escHandler = function(event) {
        if (event.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}
