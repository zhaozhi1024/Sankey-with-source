import * as d3 from 'd3';

export class LinkPath {
    private width;
    private height;
    private colmInterval;
    private margin = { top: 0, right: 10, bottom: 0, left: 0 };
    private svg: d3.Selection<any, {}, HTMLElement, any>;
    private nodeAddWidth = 10;
    private nodeAddHeight = 15;
    private data: ILinkPathInfo;
    private linkPathTooltip: HTMLDivElement;

    constructor(private linkPathPane: HTMLDivElement) {
        this.createTooltipEle();
    }

    private createTooltipEle() {
        this.linkPathTooltip = document.createElement('div');
        this.linkPathTooltip.setAttribute('style', `
        position: absolute;
        background: black;
        opacity: 0.9;
        top: 0;
        left: 0;
        width: auto;
        white-space: nowrap;
        transition-duration: 120;
        border-radius: 5px;
        z-index: 9999;
        padding: 5px 10px;
        display: none;`);
        const position = window.getComputedStyle(this.linkPathPane).position;
        if (!(position == 'relative' || position == 'absolute')) {
            this.linkPathPane.style.setProperty('position', 'relative');
        }
        this.linkPathPane.appendChild(this.linkPathTooltip);
    }
    clearLinkPathInfo() {
        this.data = {
            levelSumCount: 1,
            linkInfo: []
        }
        this.clean();
    }

    draw(data) {
        this.data = data;
        this.getSize();
        this.clean();
        this.drawSvg();
        this.drawMarker();
        this.drawNodeLabel();
        this.drawLine();
        this.drawLinkInfo();
        this.bindEvent();
    }
    resize() {
        if (this.data.linkInfo.length > 0) {
            this.getSize();
            this.clean();
            this.drawSvg();
            this.drawMarker();
            this.drawNodeLabel();
            this.drawLine();
            this.drawLinkInfo();
            this.bindEvent();
        }
    }

    private getSize() {
        var a = this.linkPathPane.getClientRects();
        if (a && a[0]) {

            this.width = a[0].width - this.margin.left - this.margin.right;
            this.height = a[0].height - this.margin.top - this.margin.bottom;
            this.colmInterval = this.width / (this.data.levelSumCount - 1);
        }
    }
    private drawSvg() {
        this.svg = d3.select(this.linkPathPane).append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
    }

    private drawMarker() {
        this.svg.append('defs').selectAll('.markerArrow')
            .data(this.data.linkInfo)
            .enter()
            .append('marker')
            .attr('id', (d: LinkInfo) => 'markerArrow' + d.nodeId)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr("markerUnits", "strokeWidth")
            .attr('viewBox', '0 0 11 11')
            .attr('refX', 11)
            .attr('refY', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M2,2 L2,11 L10,6 L2,2')
            .attr('fill', (d: any) => d.color)
    }
    private drawNodeLabel() {
        this.svg.selectAll('.nodeLabelG')
            .data(this.data.linkInfo)
            .enter()
            .append('g')
            .attr("class", "nodeLabelG")
            .attr("transform", (d: LinkInfo) => `translate(${this.colmInterval * d.levelIndex},0)`)
            .append('rect')
            .attr('id', (d: LinkInfo) => 'nodeLabelRect' + d.levelIndex)
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 100)
            .attr("height", 100)
            .attr("stroke", (d: LinkInfo) => d.color)
            .attr('stroke-width', 1)
            .attr("fill", (d: LinkInfo) => d.color);

        this.svg.selectAll('.nodeLabelG')
            .append('text')
            .attr("x", 0)
            .attr("y", 0)
            .attr("fill", "white")
            .style("font-size", 12)
            .style("line-height", 12)
            .style("font-family", "PingFangSC")
            .text(function (d, i) {
                return "";
            })
            .append('tspan')
            .attr('id', (d: any) => 'nodeLabelText' + d.levelIndex)
            .attr("x", 5)
            .attr("y", 0)
            .attr("dy", "1.7em")
            //.attr('dominant-baseline', 'hanging')
            .attr("text-anchor", (d: any) => {
                let result = 'start';
                // if (d.levelIndex === 0) {
                //   result = "start";
                // } else if (d.levelIndex === this.data.levelSumCount - 1) {
                //   result = "end"
                // } else {
                //   result = "middle"
                // }
                return result;
            })
            .text((d: any) => {
                return d.nodeLabel;
            });

        this.svg.selectAll('.nodeLabelG')
            .attr("transform", (d: any) => {
                let result = '';
                if (d.levelIndex === 0) {
                    result = `translate(0,0)`;
                } else if (d.levelIndex === this.data.levelSumCount - 1) {
                    result = `translate(${this.colmInterval * d.levelIndex - (this.getDimensions('nodeLabelText' + d.levelIndex).w + this.nodeAddWidth)},0)`
                } else {
                    result = `translate(${this.colmInterval * d.levelIndex - 0.5 * (this.getDimensions('nodeLabelText' + d.levelIndex).w + this.nodeAddWidth)},0)`
                }
                return result;
            })
            .selectAll('rect')
            // .attr('width', 50)
            // .attr('height', 50)

            .attr('width', (d: any) => this.getDimensions('nodeLabelText' + d.levelIndex).w + this.nodeAddWidth)
            .attr('height', (d: any) => this.getDimensions('nodeLabelText' + d.levelIndex).h + this.nodeAddHeight)
    }
    private drawLine() {
        this.svg.selectAll('.xlineG')
            .data(this.data.linkInfo)
            .enter()
            .filter((d, i) => i < this.data.linkInfo.length - 1)
            .append('g').attr("class", "xlineG")
            .attr("transform", (d: LinkInfo) => {
                let tranX = 0;
                if (d.direction > 0) {
                    if (d.levelIndex === 0) {
                        tranX = this.getDimensions('nodeLabelRect' + d.levelIndex).w;
                    } else if (d.levelIndex === this.data.levelSumCount - 1) {
                        tranX = this.colmInterval * d.levelIndex - (this.getDimensions('nodeLabelRect' + d.levelIndex).w);
                    } else {
                        tranX = this.colmInterval * d.levelIndex + 0.5 * (this.getDimensions('nodeLabelRect' + d.levelIndex).w);
                    }
                } else {
                    tranX = this.colmInterval * d.levelIndex - this.getDimensions('nodeLabelRect' + d.levelIndex).w /
                        (d.levelIndex === this.data.levelSumCount - 1 ? 1 : 2);
                    // if (d.levelIndex === 0) {
                    //   tranX = `translate(${this.getDimensions('nodeLabelRect' + d.levelIndex).w},0)`;
                    // } else if (d.levelIndex === this.data.levelSumCount - 1) {
                    //   tranX = `translate(${this.colmInterval * d.levelIndex - (this.getDimensions('nodeLabelRect' + d.levelIndex).w)},0)`;
                    // } else {
                    //   tranX = `translate(${this.colmInterval * d.levelIndex + 0.5 * (this.getDimensions('nodeLabelRect' + d.levelIndex).w)},0)`;
                    // }
                }

                return `translate(${tranX},0)`;
            })
            .append('line')
            .attr('x1', 0)
            .attr('y1', 15)
            .attr('x2', (d: LinkInfo, i) => {
                let result = 0;
                // if (d.levelIndex === 0) {
                //   result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i+1].levelIndex) - this.getDimensions('nodeLabelRect' + 0).w - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i+1].levelIndex)).w / 2.0;
                // } else if (d.levelIndex === this.data.levelSumCount - 2) {
                //   result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i+1].levelIndex) - this.getDimensions('nodeLabelRect' + d.levelIndex).w / 2.0 - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i+1].levelIndex)).w;
                // } else {
                //   result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i+1].levelIndex) - this.getDimensions('nodeLabelRect' + d.levelIndex).w / 2.0 - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i+1].levelIndex)).w / 2.0;
                // }
                if (d.direction > 0) {
                    result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i + 1].levelIndex)
                        - this.getDimensions('nodeLabelRect' + d.levelIndex).w / (d.levelIndex === 0 ? 1 : 2.0)
                        - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i + 1].levelIndex)).w /
                        (this.data.linkInfo[i + 1].levelIndex === this.data.levelSumCount - 1 ? 1 : 2.0);
                } else {
                    result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i + 1].levelIndex)
                        - this.getDimensions('nodeLabelRect' + d.levelIndex).w / (d.levelIndex === this.data.levelSumCount - 1 ? 1 : 2.0)
                        - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i + 1].levelIndex)).w /
                        (this.data.linkInfo[i + 1].levelIndex === 0 ? 1 : 2.0);
                    result = - result;
                }

                return result;

            })
            .attr('y2', 15)
            .attr('stroke', (d: LinkInfo) => d.color)
            .attr('stroke-width', 2)
            .attr('marker-end', (d: LinkInfo) => 'url(#markerArrow' + d.nodeId + ')');

    }
    private drawLinkInfo() {
        this.svg.selectAll('.xlineG')
            .append('text')
            .attr("x", (d: any, i) => {
                let result = 0;
                if (d.direction > 0) {
                    result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i + 1].levelIndex)
                        - this.getDimensions('nodeLabelRect' + d.levelIndex).w / (d.levelIndex === 0 ? 1 : 2.0)
                        - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i + 1].levelIndex)).w /
                        (this.data.linkInfo[i + 1].levelIndex === this.data.levelSumCount - 1 ? 1 : 2.0);
                } else {
                    result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i + 1].levelIndex)
                        - this.getDimensions('nodeLabelRect' + d.levelIndex).w / (d.levelIndex === this.data.levelSumCount - 1 ? 1 : 2.0)
                        - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i + 1].levelIndex)).w /
                        (this.data.linkInfo[i + 1].levelIndex === 0 ? 1 : 2.0);
                    result = - result;
                }
                return 0.5 * result;
            })
            .attr("y", 10)
            .attr("text-anchor", "middle")
            //.attr('dominant-baseline', 'hanging')
            .style("font-size", 12)
            // .attr('fill', '#404048')
            .attr('fill', (d: any) => d.color)
            .attr('font-family', 'PingFangSC')
            .text((d: any) => d.linkValue);

        // 注释第一级反向数据（应产品需求）
        // this.svg.selectAll('.xlineG')
        //     .append('text')
        //     .attr('class', 'restValueText')
        //     .attr("x", (d: any, i) => {
        //         let result = 0;
        //         if (d.direction > 0) {
        //             result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i + 1].levelIndex)
        //                 - this.getDimensions('nodeLabelRect' + d.levelIndex).w / (d.levelIndex === 0 ? 1 : 2.0)
        //                 - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i + 1].levelIndex)).w /
        //                 (this.data.linkInfo[i + 1].levelIndex === this.data.levelSumCount - 1 ? 1 : 2.0);
        //         } else {
        //             result = this.colmInterval * Math.abs(d.levelIndex - this.data.linkInfo[i + 1].levelIndex)
        //                 - this.getDimensions('nodeLabelRect' + d.levelIndex).w / (d.levelIndex === this.data.levelSumCount - 1 ? 1 : 2.0)
        //                 - this.getDimensions('nodeLabelRect' + (this.data.linkInfo[i + 1].levelIndex)).w /
        //                 (this.data.linkInfo[i + 1].levelIndex === 0 ? 1 : 2.0);
        //             result = - result;
        //         }
        //         return 0.5 * result;
        //     })
        //     .attr("y", 30)
        //     .attr("text-anchor", "middle")
        //     //.attr('dominant-baseline', 'hanging')
        //     .style("font-size", 12)
        //     .attr('fill', '#404048')
        //     .attr('font-family', 'PingFangSC')
        //     .text((d: any) => d.linkRestValue)

    }
    private showTooltip(tipsArray: string[]) {
        let spanDom = document.createElement('span');
        spanDom.setAttribute('style', `
            line-height: 20px;
            font-size: 12px;
            color: white;
            font-family: PingFangSC;
        `)
        // spanDom.setAttribute('class', 'linkPathTooptipSpan');
        tipsArray.forEach(tip => {
            spanDom.innerHTML = tip;
        })

        //ulDom.style.setProperty('width', maxWidth + 'px');
        while (this.linkPathTooltip.firstChild) {
            this.linkPathTooltip.removeChild(this.linkPathTooltip.firstChild);
        }
        this.linkPathTooltip.style.setProperty('display', 'block');
        this.linkPathTooltip.appendChild(spanDom);
    }
    private moveTooltip(left: number, top: number) {
        this.linkPathTooltip.style.setProperty('top', top + 'px');
        this.linkPathTooltip.style.setProperty('left', left + 'px');
    }
    private hiddenTooltip() {
        while (this.linkPathTooltip.firstChild) {
            this.linkPathTooltip.removeChild(this.linkPathTooltip.firstChild);
        }
        this.linkPathTooltip.style.setProperty('display', 'none');
    }

    private unbindEvent() {
        this.svg && this.svg.selectAll('.restValueText').on('mouseover', null);
        this.svg && this.svg.selectAll('.restValueText').on('mousemove', null);
        this.svg && this.svg.selectAll('.restValueText').on('mouseout', null);
    }
    private bindEvent() {
        this.svg.selectAll('.restValueText').on('mouseover', (d: LinkInfo) => {
            this.showTooltip([`${d.nodeLabel}的人里，未做过（${d.nextNodeLabel}）的人`]);
        })
        this.svg.selectAll(".restValueText").on("mousemove", (d) => {

            let mouseCoords = d3.mouse(this.svg.node());
            let xCo = mouseCoords[0] + 10;
            let yCo = mouseCoords[1] + 10;
            let rectW = Number(window.getComputedStyle(this.linkPathTooltip).width.replace('px', ''));
            let rectH = Number(window.getComputedStyle(this.linkPathTooltip).height.replace('px', ''));
            if (xCo + rectW > this.width) {
                xCo = xCo - rectW - 20;
            }
            // if (yCo + rectH > this.height) {
            //     yCo = mouseCoords[1] - 10 - (yCo + rectH - this.height);
            // }

            this.moveTooltip(xCo, yCo - rectH);
        });

        this.svg.selectAll(".restValueText").on("mouseout", (d) => {
            this.hiddenTooltip();
        })
    }
    private getDimensions(id) {
        var el = document.getElementById(id);
        var w = 0,
            h = 0;
        if (el) {
            var dimensions = (<any>el).getBBox();
            w = dimensions.width;
            h = dimensions.height;
        } else {
            console.log("error: getDimensions() " + id + " not found.");
        }
        return {
            w: w,
            h: h
        };
    }
    private clean() {
        this.unbindEvent();
        this.svg && this.svg.remove();
        d3.select(this.linkPathPane).select('svg').remove();
    }

    destroy() {
        this.unbindEvent();
        this.svg && this.svg.remove();
        d3.select(this.linkPathPane).select('svg').remove();
    }
}

export interface ILinkPathInfo {
    levelSumCount: number,
    linkInfo: LinkInfo[]
}

interface LinkInfo {
    direction: 1 | 0 | -1,
    nodeId: string,
    nodeLabel: string,
    nextNodeLabel: string,
    color?: string,
    linkValue?: string,
    linkRestValue?: string,
    levelIndex: number
}
