    
function waitForTransition(element) {
    return new Promise((resolve) => {
        const handleTransitionEnd = () => {
            element.removeEventListener('transitionend', handleTransitionEnd);
            resolve();
        };
        element.addEventListener('transitionend', handleTransitionEnd);
    });
}
function convertToRGBA(color, alpha) {
    let rgbaColor = '';

    if (color.startsWith('rgb')) {
        rgbaColor = color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    else {
        const tempElem = document.createElement('div');
        tempElem.style.color = color;
        document.body.appendChild(tempElem);
        const computedColor = window.getComputedStyle(tempElem).color;
        document.body.removeChild(tempElem);
        rgbaColor = computedColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    return rgbaColor;
}
//document.querySelectorAll('.botton').forEach(elem => {
//    elem.addEventListener('click', async (e) => {
//        e.stopPropagation();

//        const minHeightToExpand = 400;
//        const minWidthToExpand = 400;

//        const textVert = elem.querySelector('.btn-text-vertical');
//        const textHorin = elem.querySelector('.btn-text-horizontal');
//        const textFault = elem.querySelector('.fault_text');
//        const sTime = elem.querySelectorAll('.space_timev, .space_timeh');
//        const tableBtn = elem.querySelector('.showTableBtn');
//        const top10Btn = elem.querySelector('.showTop10Btn');
//        const infOPE = elem.querySelector('.showOPE');

//        const tableWrapper = document.getElementById('productsTableWrapper');
//        const stateChart = elem.querySelector('.stateChartContainer');
//        const rootStyles = getComputedStyle(document.documentElement);

//        if (tableBtn) {
//            if (tableBtn && (e.target === tableBtn || tableBtn.contains(e.target))) {
//                return;
//            }
//        }
//        if (top10Btn) {
//            if (top10Btn && (e.target === top10Btn || top10Btn.contains(e.target))) {
//                return;
//            }
//        }

//        if (elem.classList.contains('transition-in-progress')) {
//            return;
//        }

//        if (textVert && sTime.length > 0) {
//            if (!elem.classList.contains('animating')) {
//                elem.classList.add('animating');
//                elem.classList.add('transition-in-progress');
//                textVert.classList.add('animate');
//                textVert.classList.remove('nanimate');

//                elem.style.width = 'calc(220px*var(--scale-factor-width))';
//                elem.style.zIndex = '4';
//                const currentHeight = elem.getBoundingClientRect().height;
//                if (currentHeight <= minHeightToExpand) {
//                    elem.style.height = `calc(${minHeightToExpand}px* var(--scale-factor-height))`
//                }
//                textVert.style.writingMode = "horizontal-tb";

//                if (textFault) {
//                    textFault.style.position = 'relative';
//                }
//                if (tableBtn) {
//                    tableBtn.style.position = 'relative';
//                }
//                if (top10Btn) {
//                    top10Btn.style.position = 'relative';
//                }
//                if (infOPE) {
//                    infOPE.style.position = 'relative';
//                }
//                if (stateChart) {
//                    stateChart.style.position = 'relative';
//                }
//                sTime.forEach(divs => {
//                    divs.style.position = 'relative';
//                });

//                await waitForTransition(elem);

//                sTime.forEach(divs => {
//                    divs.classList.add('animate');
//                    divs.style.opacity = 1;
//                    //divs.style.position = 'relative';
//                });

//                if (textFault) {
//                    textFault.classList.add('animate');
//                    textFault.style.opacity = 1;
//                    //textFault.style.position = 'relative';
//                    textFault.style.pointerEvents = 'auto';
//                }
//                if (tableBtn) {
//                    tableBtn.classList.add('animate');
//                    tableBtn.style.opacity = 1;
//                    tableBtn.style.pointerEvents = 'auto';
//                }
//                if (top10Btn) {
//                    top10Btn.classList.add('animate');
//                    top10Btn.style.opacity = 1;
//                    top10Btn.style.pointerEvents = 'auto';
//                }
//                if (infOPE) {
//                    infOPE.classList.add('animate');
//                    infOPE.style.opacity = 1;
//                    infOPE.style.pointerEvents = 'auto';
//                }
//                if (stateChart) {
//                    stateChart.style.visibility = 'visible';
//                }
//                elem.classList.remove('transition-in-progress');
//            } else {
//                tableWrapper.style.display = 'none';
//                if (textFault) {
//                    textFault.classList.remove('animate');
//                    textFault.style.opacity = 0;
//                    textFault.style.position = 'absolute';
//                    textFault.style.pointerEvents = 'none';
//                }
//                if (tableBtn) {
//                    tableBtn.classList.remove('animate');
//                    tableBtn.style.opacity = 0;
//                    tableBtn.style.position = 'absolute';
//                    tableBtn.style.pointerEvents = 'none';
//                }
//                if (top10Btn) {
//                    top10Btn.classList.remove('animate');
//                    top10Btn.style.opacity = 0;
//                    top10Btn.style.position = 'absolute';
//                    top10Btn.style.pointerEvents = 'none';
//                }
//                if (infOPE) {
//                    infOPE.classList.remove('animate');
//                    infOPE.style.opacity = 0;
//                    infOPE.style.position = 'absolute';
//                    infOPE.style.pointerEvents = 'none';
//                }
//                if (stateChart) {
//                    stateChart.style.visibility = 'hidden';
//                    stateChart.style.position = 'absolute';
//                }
//                const borderColor = window.getComputedStyle(elem).borderColor;
//                const rgbaColor = convertToRGBA(borderColor, 0.1);
//                //elem.style.backgroundColor = rgbaColor;
//                elem.style.width = 'calc(var(--btn-height)*var(--scale-factor-width))';
//                elem.style.zIndex = '-1';

//                textVert.style.writingMode = "vertical-lr";
//                sTime.forEach(divs => {
//                    divs.classList.remove('animate');
//                    divs.style.opacity = 0;
//                    divs.style.position = 'absolute';
//                });
//                textVert.classList.remove('animate');
//                elem.classList.remove('animating');
//                textVert.classList.add('nanimate');

//                const buttonClass = [...elem.classList].find(cls => cls.startsWith('btn-'));

//                if (buttonClass) {
//                    const variableName = `--btn-scale-${buttonClass.replace('btn-', '')}`;
//                    const variableValue = rootStyles.getPropertyValue(variableName).trim();

//                    if (variableValue) {
//                        elem.style.height = `calc(${variableValue} * var(--scale-factor-height))`;
//                        console.log(`Set height of ${buttonClass} to calc(${variableValue} * var(--scale-factor-height))`);
//                    } else {
//                        console.warn(`Variable ${variableName} not found in :root`);
//                    }
//                }
//            }
//        } else if (textHorin && sTime.length > 0) {
//            if (!elem.style.getPropertyValue('--original-top')) {
//                const facHeight = parseFloat(rootStyles.getPropertyValue('--scale-factor-height').trim());
//                const vertOff = parseFloat(rootStyles.getPropertyValue('--vertical-offset').trim());
//                const computedTop = parseFloat(getComputedStyle(elem).top);
//                var topOnly = Math.round((computedTop / facHeight) - vertOff);
//                console.log(`Top: ${topOnly}`);
//                elem.style.setProperty('--original-top', `${Math.round(topOnly)}px`);
//            }
//            if (!elem.classList.contains('animating')) {
//                elem.classList.add('animating');
//                textHorin.classList.add('animate');
//                textHorin.classList.remove('nanimate');
//                elem.classList.add('transition-in-progress');
//                textHorin.style.fontSize = "calc(20px* var(--scale-factor-height))";
//                elem.style.height = 'calc(250px*var(--scale-factor-height))';
//                elem.style.top = 'calc((var(--original-top) - 250px + var(--btn-height) + var(--vertical-offset))*var(--scale-factor-height))'
//                elem.style.zIndex = '4';
//                const currentWidth = elem.getBoundingClientRect().width;
//                if (currentWidth < minWidthToExpand) {
//                    elem.style.width = `calc(${minWidthToExpand}px* var(--scale-factor-width))`
//                }

//                if (textFault) {
//                    textFault.style.position = 'relative';
//                }
//                if (tableBtn) {
//                    tableBtn.style.position = 'relative';
//                }
//                if (top10Btn) {
//                    top10Btn.style.position = 'relative';
//                }
//                if (infOPE) {
//                    infOPE.style.position = 'relative';
//                }
//                if (stateChart) {
//                    stateChart.style.position = 'relative';
//                }
//                sTime.forEach(divs => {
//                    divs.style.position = 'relative';
//                });
//                await waitForTransition(elem);

//                sTime.forEach(divs => {
//                    divs.classList.add('animate');
//                    divs.style.opacity = 1;

//                    divs.style.transition = "opacity 1000ms ease";
//                });

//                if (textFault) {
//                    //textFault.classList.add('animate');
//                    textFault.style.opacity = 1;

//                    textFault.style.pointerEvents = 'auto';
//                }
//                if (tableBtn) {
//                    tableBtn.classList.add('animate');
//                    tableBtn.style.opacity = 1;
//                    tableBtn.style.pointerEvents = 'auto';
//                }
//                if (top10Btn) {
//                    top10Btn.classList.add('animate');
//                    top10Btn.style.opacity = 1;
//                    top10Btn.style.pointerEvents = 'auto';
//                }
//                if (infOPE) {
//                    infOPE.classList.add('animate');
//                    infOPE.style.opacity = 1;
//                    infOPE.style.pointerEvents = 'auto';
//                }
//                if (stateChart) {
//                    stateChart.style.visibility = 'visible';
//                }
//                elem.classList.remove('transition-in-progress');
//            } else {
//                tableWrapper.style.display = 'none';
//                if (textFault) {
//                    //textFault.classList.remove('animate');
//                    textFault.style.opacity = 0;
//                    textFault.style.position = 'absolute';
//                    textFault.style.pointerEvents = 'none';
//                }
//                if (tableBtn) {
//                    tableBtn.classList.remove('animate');
//                    tableBtn.style.opacity = 0;
//                    tableBtn.style.position = 'absolute';
//                    tableBtn.style.pointerEvents = 'none';
//                }
//                if (top10Btn) {
//                    top10Btn.classList.remove('animate');
//                    top10Btn.style.opacity = 0;
//                    top10Btn.style.position = 'absolute';
//                    top10Btn.style.pointerEvents = 'none';
//                }
//                if (infOPE) {
//                    infOPE.classList.remove('animate');
//                    infOPE.style.opacity = 0;
//                    infOPE.style.position = 'absolute';
//                    infOPE.style.pointerEvents = 'none';
//                }
//                if (stateChart) {
//                    stateChart.style.visibility = 'hidden';
//                    stateChart.style.position = 'absolute';
//                }
//                const borderColor = window.getComputedStyle(elem).borderColor;
//                const rgbaColor = convertToRGBA(borderColor, 0.1);
//                //elem.style.backgroundColor = rgbaColor;
//                elem.style.height = 'calc(var(--btn-height)*var(--scale-factor-height))';
//                elem.style.top = 'calc((var(--original-top) + var(--vertical-offset)) * var(--scale-factor-height))';
//                elem.style.zIndex = '-1';
//                sTime.forEach(divs => {
//                    divs.classList.remove('animate');
//                    divs.style.opacity = 0;
//                    divs.style.position = 'absolute';
//                    divs.style.transition = "opacity 0ms ease";
//                });
//                elem.classList.remove('animating');
//                textHorin.classList.remove('animate');
//                textHorin.classList.add('nanimate');
//                textHorin.style.fontSize = "calc(15px*var(--scale-factor-height))";
//                const buttonClass = [...elem.classList].find(cls => cls.startsWith('btn-'));

//                if (buttonClass) {
//                    const variableName = `--btn-scale-${buttonClass.replace('btn-', '')}`;
//                    const rootStyles = getComputedStyle(document.documentElement);
//                    const variableValue = rootStyles.getPropertyValue(variableName).trim();

//                    if (variableValue) {
//                        elem.style.width = `calc(${variableValue} * var(--scale-factor-width))`;
//                        console.log(`Set height of ${buttonClass} to calc(${variableValue} * var(--scale-factor-width))`);
//                    } else {
//                        console.warn(`Variable ${variableName} not found in :root`);
//                    }
//                }
//            }
//        }
//    });
//});
const minHeightToExpand = 400;
const minWidthToExpand = 420;
const ANIMATED_WHEN_EXPANDED = [
    '.fault_text',
    '.showTableBtn',
    '.showTop10Btn',
    '.showOPE',
    '.stateChartContainer',
    '.space_timev',
    '.space_timeh',
];
const ANIMATED_WHEN_UNEXPANDED = [
    '.progress-text',
];
//function getAnimatedElements(elem) {
//    const elements = [];
//    ANIMATED_WHEN_EXPANDED.forEach(selector => {
//        if (selector.startsWith('.space_time')) {
//            // Se for múltiplos (nodelist)
//            elem.querySelectorAll(selector).forEach(el => elements.push(el));
//        } else {
//            const el = elem.querySelector(selector);
//            if (el) elements.push(el);
//        }
//    });
//    return elements;
//}
function getAnimatedElements(elem) {
    return ANIMATED_WHEN_EXPANDED.flatMap(selector =>
        Array.from(elem.querySelectorAll(selector))
    );
}
function getHiddenAndShowElements(elem) {
    return ANIMATED_WHEN_UNEXPANDED.flatMap(selector =>
        Array.from(elem.querySelectorAll(selector))
    );
}

function prepareExpandElements(elem) {
    const animatedElems = getAnimatedElements(elem);
    animatedElems.forEach(e => {
        e.style.position = 'relative';
    });
}
function toggleExpandElements(elem) {
    const animatedElems = getAnimatedElements(elem);

    // Se nenhum elemento foi encontrado, nada a fazer
    if (animatedElems.length === 0) return;

    const isVisible = getComputedStyle(animatedElems[0]).visibility !== 'hidden';

    animatedElems.forEach(e => {
        if (isVisible) {
            e.classList.remove('animate');
            e.style.opacity = 0;
            e.style.position = 'absolute';
            e.style.pointerEvents = 'none';
            e.style.visibility = 'hidden';
        } else {
            e.classList.add('animate');
            e.style.opacity = 1;
            e.style.pointerEvents = 'auto';
            e.style.visibility = 'visible';
            e.style.position = 'relative';
        }
    });
}

//function showExpandElements(elem) {
//    const animatedElems = getAnimatedElements(elem);
//    animatedElems.forEach(e => {
//        e.classList.add('animate');
//        e.style.opacity = 1;
//        e.style.pointerEvents = 'auto';
//        e.style.visibility = 'visible';
//    });
//}

//function showUnexpandElements(elem) {
//    const unimatedElems = getUnimatedElements(elem);
//    unimatedElems.forEach(e => {
//        e.style.position = 'relative';
//        e.classList.add('animate');
//        e.style.opacity = 1;
//        e.style.pointerEvents = 'auto';
//        e.style.visibility = 'visible';
//    });

    
//}

//function hideExpandElements(elem) {
//    const animatedElems = getAnimatedElements(elem);
//    animatedElems.forEach(e => {
//        e.classList.remove('animate');
//        e.style.opacity = 0;
//        e.style.position = 'absolute';
//        e.style.pointerEvents = 'none';
//        e.style.visibility = 'hidden';
//    });
//}

//function hideUnexpandElements(elem) {
//    const unimatedElems = getUnimatedElements(elem);
//    unimatedElems.forEach(e => {
//        e.classList.remove('animate');
//        e.style.opacity = 0;
//        e.style.position = 'absolute';
//        e.style.pointerEvents = 'none';
//        e.style.visibility = 'hidden';
//    });
//}

async function expandButtonVertical(elem) {
    const facHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-factor-height').trim());

    const textVert = elem.querySelector('.btn-text-vertical');

    elem.classList.add('animating', 'transition-in-progress');
    textVert.classList.add('animate');
    textVert.classList.remove('nanimate');

    elem.style.width = 'calc(220px*var(--scale-factor-width))';
    elem.style.zIndex = '4';
    const currentHeight = elem.getBoundingClientRect().height / facHeight;
    //console.log('currentHeight: ' + currentHeight / facHeight);
    //console.log('facHeight: ' + facHeight);
    if (currentHeight <= minHeightToExpand) {
        elem.style.height = `calc(${minHeightToExpand}px* var(--scale-factor-height))`
    }
    //elem.style.height = `calc(400px*var(--scale-factor-height))`;
    textVert.style.writingMode = "horizontal-tb";

    prepareExpandElements(elem);

    await waitForTransition(elem);

    toggleExpandElements(elem);
    

    elem.classList.remove('transition-in-progress');
}

async function expandButtonHorizontal(elem) {
    const rootStyles = getComputedStyle(document.documentElement);
    const textHorin = elem.querySelector('.btn-text-horizontal');

    if (!elem.style.getPropertyValue('--original-top')) {
        const facHeight = parseFloat(rootStyles.getPropertyValue('--scale-factor-height').trim());
        const vertOff = parseFloat(rootStyles.getPropertyValue('--vertical-offset').trim());
        const computedTop = parseFloat(getComputedStyle(elem).top);
        var topOnly = Math.round((computedTop / facHeight) - vertOff);
        elem.style.setProperty('--original-top', `${Math.round(topOnly)}px`);
    }
    if (!elem.classList.contains('animating')) {
        elem.classList.add('animating', 'transition-in-progress');
        elem.style.height = 'calc(250px*var(--scale-factor-height))';
        elem.style.top = 'calc((var(--original-top) - 250px + var(--btn-height) + var(--vertical-offset))*var(--scale-factor-height))';
        elem.style.zIndex = '4';

        textHorin.style.fontSize = "calc(20px* var(--scale-factor-height))";
        textHorin.classList.add('animate');
        textHorin.classList.remove('nanimate');
        const currentWidth = elem.getBoundingClientRect().width;
        if (currentWidth < minWidthToExpand) {
            elem.style.width = `calc(${minWidthToExpand}px* var(--scale-factor-width))`
        }

        prepareExpandElements(elem);

        await waitForTransition(elem);

        toggleExpandElements(elem);

        elem.classList.remove('transition-in-progress');
    }
}

function resetButtonVertical(elem) {
    
    const textVert = elem.querySelector('.btn-text-vertical');
    const sTime = elem.querySelectorAll('.space_timev, .space_timeh');

    elem.style.width = 'calc(var(--btn-height)*var(--scale-factor-width))';
    textVert.style.writingMode = "vertical-lr";

    elem.style.width = 'calc(var(--btn-height)*var(--scale-factor-width))';
    elem.style.zIndex = '-1';

    textVert.classList.remove('animate');
    textVert.classList.add('nanimate');
    elem.classList.remove('animating');

    //hideExpandElements(elem);

    toggleExpandElements(elem);

    const buttonClass = [...elem.classList].find(cls => cls.startsWith('btn-'));

    if (buttonClass) {
        const variableName = `--btn-scale-${buttonClass.replace('btn-', '')}`;
        const rootStyles = getComputedStyle(document.documentElement);
        const variableValue = rootStyles.getPropertyValue(variableName).trim();

        if (variableValue) {
            elem.style.height = `calc(${variableValue} * var(--scale-factor-height))`;
        } else {
            console.warn(`Variable ${variableName} not found in :root`);
        }
    }
}
function resetButtonHorizontal(elem) {
    const textHorin = elem.querySelector('.btn-text-horizontal');
    const sTime = elem.querySelectorAll('.space_timev, .space_timeh');

    elem.style.height = 'calc(var(--btn-height)*var(--scale-factor-height))';

    //hideExpandElements(elem);

    toggleExpandElements(elem);

    textHorin.classList.remove('animate');
    textHorin.classList.add('nanimate');
    textHorin.style.fontSize = "calc(15px*var(--scale-factor-height))";
    elem.classList.remove('animating');

    elem.style.height = 'calc(var(--btn-height)*var(--scale-factor-height))';
    elem.style.top = 'calc((var(--original-top) + var(--vertical-offset)) * var(--scale-factor-height))';
    elem.style.zIndex = '-1';
    
    const buttonClass = [...elem.classList].find(cls => cls.startsWith('btn-'));

    if (buttonClass) {
        const variableName = `--btn-scale-${buttonClass.replace('btn-', '')}`;
        const rootStyles = getComputedStyle(document.documentElement);
        const variableValue = rootStyles.getPropertyValue(variableName).trim();

        if (variableValue) {
            elem.style.width = `calc(${variableValue} * var(--scale-factor-width))`;
            //console.log(`Set height of ${buttonClass} to calc(${variableValue} * var(--scale-factor-width))`);
        }// else {
        //    console.warn(`Variable ${variableName} not found in :root`);
        //}
    }

}
document.querySelectorAll('.botton').forEach(elem => {
    elem.addEventListener('click', async (e) => {
        e.stopPropagation();

        const tableBtn = elem.querySelector('.showTableBtn');
        const top10Btn = elem.querySelector('.showTop10Btn');
        const textVert = elem.querySelector('.btn-text-vertical');
        const textHorin = elem.querySelector('.btn-text-horizontal');
        const sTime = elem.querySelectorAll('.space_timev, .space_timeh');


        if (tableBtn) {
            if (tableBtn && (e.target === tableBtn || tableBtn.contains(e.target))) {
                return;
            }
        }
        if (top10Btn) {
            if (top10Btn && (e.target === top10Btn || top10Btn.contains(e.target))) {
                return;
            }
        }

        if (elem.classList.contains('transition-in-progress')) return;

        

        if (textVert && sTime.length > 0) {
            if (!elem.classList.contains('animating')) {
                await expandButtonVertical(elem);
            } else {
                await resetButtonVertical(elem);
            }
        } else if (textHorin && sTime.length > 0) {
            if (!elem.classList.contains('animating')) {
                await expandButtonHorizontal(elem);
            } else {
                await resetButtonHorizontal(elem);
            }
        }
    });
});
