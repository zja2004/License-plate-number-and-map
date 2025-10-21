// 初始化地图
const mapContainer = document.getElementById('map');
const myChart = echarts.init(mapContainer);

// 显示加载提示
myChart.showLoading({
    text: '正在加载地图数据...\n请稍候',
    color: '#667eea',
    textColor: '#000',
    maskColor: 'rgba(255, 255, 255, 0.8)',
    zlevel: 0
});

console.log('开始加载地图数据...');

// 准备地图数据
const mapData = [];
for (let city in licensePlateData) {
    mapData.push({
        name: city,
        value: Math.random() * 100 + 50,
        plate: licensePlateData[city]
    });
}

// 尝试多个 CDN 源加载地图数据
const mapUrls = [
    'https://cdn.jsdelivr.net/npm/echarts@5.4.3/map/json/china.json',
    'https://unpkg.com/echarts@5.4.3/map/json/china.json',
    'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
];

async function loadMapData() {
    let lastError = null;

    for (let i = 0; i < mapUrls.length; i++) {
        try {
            console.log(`尝试加载地图数据源 ${i + 1}/${mapUrls.length}: ${mapUrls[i]}`);
            const response = await fetch(mapUrls[i]);
            console.log('地图数据请求状态:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const chinaJson = await response.json();
            console.log('地图数据加载成功');
            console.log('地图特征数量:', chinaJson.features ? chinaJson.features.length : 0);
            return chinaJson;
        } catch (error) {
            console.warn(`数据源 ${i + 1} 加载失败:`, error.message);
            lastError = error;
        }
    }

    throw new Error(`所有数据源均加载失败。最后的错误: ${lastError.message}`);
}

loadMapData()
    .then(chinaJson => {
        console.log('地图数据加载成功');
        console.log('地图特征数量:', chinaJson.features ? chinaJson.features.length : 0);

        // 注册地图
        echarts.registerMap('china', chinaJson);

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
                        fontSize: 9,
                        fontWeight: 'normal'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            color: '#fff',
                            fontSize: 12,
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
                        borderWidth: 1,
                        shadowBlur: 5,
                        shadowColor: 'rgba(0, 0, 0, 0.1)'
                    },
                    data: mapData
                }
            ]
        };

        // 设置配置并渲染
        myChart.setOption(option);
        console.log('地图渲染成功！');

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
    })
    .catch(error => {
        console.error('地图加载失败:', error);
        myChart.hideLoading();

        // 显示错误信息
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            max-width: 500px;
        `;
        errorDiv.innerHTML = `
            <h3 style="color: #f44336; margin-bottom: 15px;">地图加载失败</h3>
            <p style="margin-bottom: 15px;">无法加载地图数据</p>
            <p style="color: #666; font-size: 14px;">错误信息: ${error.message}</p>
            <button onclick="location.reload()" style="
                margin-top: 15px;
                padding: 10px 30px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">重新加载</button>
        `;
        document.body.appendChild(errorDiv);
    });

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
