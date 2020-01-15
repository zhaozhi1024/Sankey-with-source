import { Util } from './util';
import * as d3 from 'd3';
import * as _ from 'lodash';

import { SankeyEngineMultilevel, Node, Link } from './sankey-engine-multilevel';
import { SankeyDataParse, SankeyData } from './sankey-data-parse';
import { LinkPath, ILinkPathInfo } from './link-path';
import { EventHandler } from './event-handler';
import { Demo } from './demo';

type HTMLString = string;
export interface SankeyConfig {
    nodeWidth?: number,
    nodePadding?: number,
    curvature?: number,

    hasShiftFunc?: boolean,
    hasCtrlFunc?: boolean
}
export interface SankeyOptions {
    parentEle: HTMLDivElement,
    data: SankeyData,
    sankeyConfig: SankeyConfig,
    nodeTooltipFormatter?: (targetId: string, targetValue: number, targetNode: Node, primaryNodes: Node[]) => HTMLString

}
class SankeyMultilevel {
    private width;
    private height;
    private margin = { top: 10, right: 10, bottom: 10, left: 10 };
    private sankey: SankeyEngineMultilevel;
    private linkPathInstance: LinkPath;
    private eventHandler: EventHandler;
    private svg: d3.Selection<any, {}, HTMLElement, any>;
    private linkG: d3.Selection<any, {}, HTMLElement, any>;
    private primaryLinks: Link[] = [];
    private primaryNodes: Node[] = [];

    private linkPathEle: HTMLDivElement;
    private nodeTooltipEle: HTMLDivElement;
    private mainDiagramEle: HTMLDivElement;

    private parentEle: HTMLDivElement;
    private data: SankeyData

    private _config: SankeyConfig = {
        nodeWidth: 20,
        nodePadding: 20,
        curvature: 0.2,

        hasShiftFunc: true,
        hasCtrlFunc: true,

        // nodeTooltipFormatter: (targetId: string, targetValue: number, targetNode: Node, primaryNodes: Node[]) => {
        //     let result = '';
        //     targetNode.tips.forEach((line, index) => {

        //         if (index == targetNode.tips.length - 1) {
        //             result = result + line;
        //         } else {
        //             result = result + line + '<br/>';
        //         }
        //     })
        //     return result;
        // }
    }
    constructor(private options: SankeyOptions) {
        this.data = options.data;
        this.parentEle = options.parentEle;
        Object.assign(this._config, options.sankeyConfig);
        this.initData();
    }

    private initData() {
        this.data.links.forEach(link => {
            this.primaryLinks.push(_.clone(link));
        });
        this.data.columns.forEach(nodes => {
            nodes.forEach(node => {
                this.primaryNodes.push(_.clone(node));
            });
        });
        const dataParse = new SankeyDataParse(this.data);
        dataParse.parseData();
        this.data = dataParse.data;
    }

    private initLinkPath() {
        this.linkPathInstance = new LinkPath(this.linkPathEle);
        this.linkPathInstance.clearLinkPathInfo();
    }


    private createLinkPathEle() {
        this.linkPathEle = document.createElement('div');
        this.linkPathEle.setAttribute('class', 'link-path');
        this.parentEle.appendChild(this.linkPathEle);
    }
    private createMainDiagramEle() {
        let className = '';
        if (this.options.sankeyConfig.hasShiftFunc) {
            className = 'sankey-diagram';
        } else {
            className = 'sankey-diagram-without-shiftfunc';
        }
        this.mainDiagramEle = document.createElement('div');
        this.mainDiagramEle.setAttribute('class', className);
        this.parentEle.appendChild(this.mainDiagramEle);
    }
    private createNodeTooltipEle() {
        this.nodeTooltipEle = document.createElement('div');
        this.nodeTooltipEle.setAttribute('class', 'sankey-node-tooltip');
        this.mainDiagramEle.appendChild(this.nodeTooltipEle);
    }

    draw() {
        this.createContainerDom();
        if (this.options.sankeyConfig.hasShiftFunc) {
            this.initLinkPath();
        }
        this.clean();
        this.getSize();
        this.drawSvg();
        this["drawSankey"]();
        this.drawTooltipForLinks();
        this.addEventHandler();
    }
    resize(){
        this.draw();
    }
    private createContainerDom() {
        d3.select(this.parentEle).selectAll('div').remove();
        if (this.options.sankeyConfig.hasShiftFunc) {
            this.createLinkPathEle();
        }
        this.createMainDiagramEle();
        this.createNodeTooltipEle();
    }

    private getSize() {
        const a = this.mainDiagramEle.getClientRects();
        if (a && a[0]) {
            this.width = a[0].width - this.margin.left - this.margin.right;
            this.height = a[0].height - this.margin.top - this.margin.bottom;
        }
    }

    private drawSvg() {
        this.svg = d3.select(this.mainDiagramEle).append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
    }

    private drawSankey() {
        this.sankey = new SankeyEngineMultilevel();
        this.sankey.nodeWidth(this._config.nodeWidth)
            .nodePadding(this._config.nodePadding)
            .curvature(this._config.curvature)
            .size([this.width, this.height]);
        const path = this.sankey.link();

        this.sankey
            .columns(<any>this.data.columns)
            .links(this.data.links)
            .layout(32);

        const clip = this.svg.append('defs').append('svg:clipPath')
            .attr('id', 'clip')
            .append('svg:rect')
            .attr('id', 'clip-rect')
            .attr('width', this.width)
            .attr('height', this.height - 2)
            .attr('fill', '#fff')
            .attr('transform', 'translate(' + 0 + ',' + 1 + ')');

        // this.linkG = this.svg.append('g');

        this.linkG = this.svg.append('g').attr('clip-path', 'url(#clip)');
        // var link = this.svg.append("g")
        //     .attr("clip-path", "url(#clip)")
        //     .selectAll(".sankeyLink")
        //     .data(this.data.links)
        //     .enter().append("path")

        //     .attr("class", "sankeyLink")
        //     .attr('sourceChain', (d) => {
        //         return d.sourceChain[0];
        //     })
        //     .attr("d", path)
        //     .style("fill", (d: any) => {
        //         return d.source.color;
        //     })
        //     .attr('fill-opacity', (d: any) => {
        //         return 0.6;
        //     }).style('display', 'none')
        // .sort((a: any, b: any) => { return b.dy - a.dy; });



        // this.svg.selectAll(".sankeyLink").on('mouseover', () => {
        //     let target = d3.select(d3.event.target);
        //     let isHighlight = target.attr('isSourceChainHighlight');
        //     if (isHighlight == "true") {
        //         //target.select('title').text((d:any)=>d.sourceChain);
        //         return;
        //     }
        //     //d3.select(d3.event.target).attr('fill-opacity', 0.5);
        // }).on('mouseout', () => {
        //     let target = d3.select(d3.event.target);
        //     let isHighlight = target.attr('isSourceChainHighlight');
        //     if (isHighlight == "true") {
        //         //target.select('title').text('');
        //         return;
        //     }
        //     // d3.select(d3.event.target).attr('fill-opacity', (d: any) => {
        //     //     return 0.1 + d.linkGroupIndex * 0.2;
        //     // });
        // })

        const nodeG = this.svg.append('g').selectAll('.nodeG')
            .data(this.sankey.getNodes())
            .enter().append('g')
            .attr('class', 'nodeG')
            .attr('transform', (d: any) => {
                return 'translate(' + d.x + ',' + d.y + ')';
            });

        nodeG.append('rect')
            .attr('clip-path', 'url(#clip-rect)')
            .attr('class', 'node')
            .attr('id', (d) => {
                // return Util.removeSomeChar(d.id);
                return d.id;
            })
            .attr('height', (d: any) => d.dy)
            .attr('width', this.sankey.getNodeWidth())
            .style('fill', (d: any) => {
                return d.color;
            })
            .style('cursor', 'pointer');
        nodeG.append('text')
            .filter(d => {
                // console.log(d.label)
                return d.value > 0;
            })
            .attr('x', -6)
            .attr('y', (d) => d.dy / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .attr('transform', null)
            .attr('font-size', '12')
            .attr('color', '#0C2237')
            .text((d) => d.label)
            .filter((d) => d.x < this.width / 2)
            .attr('x', 6 + this.sankey.getNodeWidth())
            .attr('text-anchor', 'start');
    }

    private drawTooltipForLinks() {
        const tooltipg = this.svg.append('g')
            .attr('font-family', 'PingFangSC')
            .attr('font-size', 12)
            .attr('text-anchor', 'start')
            .attr('class', 'sankeyTooltip')
            .attr('opacity', '0')
            .attr('transform', 'translate(-500,-500)');

        tooltipg.append('rect')
            .attr('id', 'sankeyTipRect')
            .attr('x', 0)
            .attr('width', 120)
            .attr('height', 80)
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('opacity', 0.9)
            .style('fill', '#000');


        tooltipg.append('text')
            .attr('id', 'sankeyTipText')
            .attr('x', 0)
            .attr('y', 0)
            .attr('fill', '#fff')
            .style('font-size', 12)
            .style('line-height', 12)
            .style('font-family', 'PingFangSC')
            .text(function (d, i) {
                return '';
            });
    }

    private addEventHandler() {
        this.eventHandler = new EventHandler(this.options,
            this.svg, this.linkG, this.height, this.width,
            this.sankey, this.linkPathInstance, this.nodeTooltipEle,
            this.primaryNodes, this.primaryLinks);
        this.eventHandler.addEventHandler();
    }

    private removeEventHandler() {
        this.eventHandler.removeEventHandler();
    }

    private clean() {
        this.eventHandler && this.removeEventHandler();
        this.svg && this.svg.remove();
        d3.select(this.mainDiagramEle).select('svg').remove();
    }
    destroy() {
        this.eventHandler && this.removeEventHandler();
        this.svg && this.svg.remove();
        d3.select(this.mainDiagramEle).select('svg').remove();
        this.sankey == null;
        this.mainDiagramEle = null;
        this.data = null;
    }

}

export function initSankey(options: SankeyOptions): SankeyMultilevel{
    // this.data = options.data;
    // this.parentEle = options.parentEle;
    // Object.assign(this._config, options.sankeyConfig);
    // this.initData();
    return new SankeyMultilevel(options);
}

export function showDemoSankey(div: HTMLDivElement){
    let demo = new Demo(div);
    demo.showDemoSankey();
}
