    
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
    '.btn-gomaope170',
    '.btn-gomaope180',
    '.btn-goma180to190',
    '.btn-gomaope190',
    '.btn-gomaope200',
];
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
    const showWhenExpanded = getAnimatedElements(elem);
    const hideWhenExpanded = getHiddenAndShowElements(elem);

    const isExpanded = showWhenExpanded.length > 0 &&
        getComputedStyle(showWhenExpanded[0]).visibility !== 'hidden';

    showWhenExpanded.forEach(e => {
        e.classList.remove('animate');
        e.style.opacity = isExpanded ? 0 : 1;
        e.style.pointerEvents = isExpanded ? 'none' : 'auto';
        e.style.visibility = isExpanded ? 'hidden' : 'visible';
        e.style.position = isExpanded ? 'absolute' : 'relative';
    });

    hideWhenExpanded.forEach(e => {
        e.classList.remove('animate');
        e.style.opacity = isExpanded ? 1 : 0;
        e.style.pointerEvents = isExpanded ? 'auto' : 'none';
        e.style.visibility = isExpanded ? 'visible' : 'hidden';
        e.style.position = isExpanded ? 'relative' : 'absolute';
    });
}

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
    const facHeightExp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-factor-height').trim());
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
        const currentWidth = elem.getBoundingClientRect().width / facHeightExp;
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
