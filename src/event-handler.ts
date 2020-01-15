import * as d3 from 'd3';
import * as _ from 'lodash';

import { SankeyEngineMultilevel, Node, Link } from './sankey-engine-multilevel';
import { SankeyOptions } from './sankey-multilevel';
import { Util } from './util';
import { LinkPath, ILinkPathInfo } from './link-path';

type HTMLElementString = string;

export class EventHandler {
    private selectedNodes: string[] = [];
    private selectedNodesD3Dom: d3.Selection<any, {}, null, undefined>[] = [];
    private linkPathInfo: ILinkPathInfo = {
        levelSumCount: 0,
        linkInfo: []
    };
    private columnMap: Map<number, string[]>;

    constructor(
        private sankeyOptions: SankeyOptions,
        private svg: d3.Selection<any, {}, HTMLElement, any>,
        private linkG: d3.Selection<any, {}, HTMLElement, any>,
        private height: number,
        private width: number,
        private sankey: SankeyEngineMultilevel,
        private linkPathInstance: LinkPath,

        private nodeTooltipEle: HTMLDivElement,
        private primaryNodes: Node[] = [],
        private primaryLinks: Link[] = []

    ) {
        this.columnMap = new Map<number, string[]>();
        this.sankeyOptions.data.columns.forEach((colm: Node[], i) => {
            this.columnMap.set(i, colm.map((node) => {
                return node.id;
            }));
        });
    }

    // setTooltipDom(formatter: () => HTMLElementString) {
    //     this.nodeTooltipEle.innerHTML = formatter();
    // }

    addEventHandler() {
        this.addEventForNodes();
    }

    removeEventHandler() {
        this.selectedNodesD3Dom = [];
        this.svg && this.svg.selectAll('.node').on('click', null);
        this.svg && this.svg.selectAll('.node').on('mouseover', null);
        this.svg && this.svg.selectAll('.node').on('mousemove', null);
        this.svg && this.svg.selectAll('.node').on('mouseout', null);

        this.svg && this.svg.selectAll('.sankeyLink').on('mouseover', null);
        this.svg && this.svg.selectAll('.sankeyLink').on('mousemove', null);
        this.svg && this.svg.selectAll('.sankeyLink').on('mouseout', null);
    }

    private addEventForNodes() {
        const _self = this;
        this.svg.selectAll('.node').on('mousedown', () => {
            const event = d3.event;
            const targetNodeId = d3.select(event.target).attr('id');

            if (this.sankeyOptions.sankeyConfig.hasCtrlFunc && (event.ctrlKey || event.metaKey)) {
                this.svg.selectAll('.sankeyLink').remove();

                this.linkPathInfo.linkInfo = [];

                if (this.selectedNodes.length < 1) {
                    this.selectedNodes.push(targetNodeId);
                    this.selectedNodesD3Dom.push(d3.select(event.target));
                } else if (this.selectedNodes.length === 1) {
                    this.selectedNodes.push(targetNodeId);
                    this.selectedNodesD3Dom.push(d3.select(event.target));
                } else if (this.selectedNodes.length > 1) {
                    this.selectedNodes.shift();
                    this.selectedNodesD3Dom[0].attr('class', 'node');
                    this.selectedNodesD3Dom.shift();
                    this.selectedNodes.push(targetNodeId);
                    this.selectedNodesD3Dom.push(d3.select(event.target));
                }
                if (this.selectedNodes.length >= 2) {
                    const links = this.primaryLinks.filter(link => {
                        return link.sourceChain.indexOf(_self.selectedNodes[0]) > -1
                            && link.sourceChain.indexOf(_self.selectedNodes[1]) > -1;
                    });
                    const linkValue = d3.sum(links, d => d.value);
                    const ids = [];
                    links.forEach(link => {
                        link.inpatIds.forEach(id => {
                            ids.push(id);
                        });
                    });
                    console.log(links, 'links');
                    const sourceNode = this.getNodeById(this.selectedNodes[0]);
                    const targetNode = this.getNodeById(this.selectedNodes[1]);
                    const dy = targetNode.dy * linkValue / targetNode.value;

                    const newLink: Link = {
                        sourceChain: [],
                        linkGroupIndex: 10,
                        source: sourceNode,
                        target: targetNode,
                        value: linkValue,
                        inpatIds: ids,
                        dy: dy,
                        sy: 0,
                        ty: 0,
                    };
                    this.linkG.selectAll('.sankeyLink')
                        .data([newLink])
                        .enter().append('path')
                        .attr('class', 'sankeyLink')
                        .attr('sourceChain', (d) => {
                            return d.sourceChain[0];
                        })
                        .attr('d', this.sankey.link())
                        .style('fill', (d: any) => {
                            return d.source.color;
                        })
                        .attr('fill-opacity', (d: any) => {
                            return 0.6;
                        });
                }

                // this.selectedNodes.forEach(id=>{
                //   d3.select('#' + id).attr('stroke', 'black');
                // })
            } else if (this.sankeyOptions.sankeyConfig.hasShiftFunc && event.shiftKey) {
                d3.event.preventDefault();
                this.selectedNodes = [];
                this.selectedNodesD3Dom.forEach(item=>{
                  item.attr('class', 'node')
                });
                this.selectedNodesD3Dom = [];

                const selectedNode = this.getNodeById(targetNodeId);
                this.linkPathInfo.levelSumCount = this.columnMap.size;
                let direction: 1 | 0 | -1;
                if (this.linkPathInfo.linkInfo.length === 0) {
                    this.svg.selectAll('.sankeyLink').remove();

                    const linkData = this.sankeyOptions.data.links.filter(link => {
                        return link.sourceChain[0].toString() === targetNodeId;
                    });
                    linkData.sort(this.compare);
                    this.linkG.selectAll('.sankeyLink')
                        .data(linkData)
                        .enter().append('path')
                        .attr('class', 'sankeyLink')
                        .attr('sourceChain', (d) => {
                            return d.sourceChain[0];
                        })
                        .attr('d', this.sankey.link())
                        .style('fill', (d: any) => {
                            return d.source.color;
                        })
                        .attr('fill-opacity', (d: any) => {
                            return 0.6;
                        });
                    direction = 0;
                    // add new one
                    this.linkPathInfo.linkInfo = [];
                    this.linkPathInfo.linkInfo.push({
                        direction: direction,
                        nodeId: selectedNode.id,
                        nodeLabel: selectedNode.label,
                        nextNodeLabel: '',
                        color: selectedNode.color,
                        levelIndex: this.getColIndexById(selectedNode.id),
                        linkValue: '',
                        linkRestValue: ''
                    });
                    // this.linkInfoChangeSubject.next(this.linkPathInfo);
                    this.redrawLinkPath(this.linkPathInfo);

                } else {

                    const lastNode = this.linkPathInfo.linkInfo[this.linkPathInfo.linkInfo.length - 1];
                    if (lastNode.direction === 0) {
                        if (this.getColIndexById(selectedNode.id) === lastNode.levelIndex) {
                            direction = lastNode.direction;
                            // clear and add new one
                            this.linkPathInfo.linkInfo = [];
                            this.linkPathInfo.linkInfo.push({
                                direction: direction,
                                nodeId: selectedNode.id,
                                nodeLabel: selectedNode.label,
                                nextNodeLabel: '',
                                color: selectedNode.color,
                                levelIndex: this.getColIndexById(selectedNode.id),
                                linkValue: '',
                                // linkRestValue: ''
                            });
                        } else {
                            direction = this.getColIndexById(selectedNode.id) > lastNode.levelIndex ? 1 : -1;
                            // add new one
                            const ids = this.linkPathInfo.linkInfo.map(item => item.nodeId);
                            ids.push(selectedNode.id);
                            const linkInfo = this.getLinkInfoByIdChain(ids);
                            lastNode.linkValue = linkInfo.linkValue;
                            // lastNode.linkRestValue = linkInfo.linkRestValue;
                            lastNode.direction = direction;
                            lastNode.nextNodeLabel = selectedNode.label;

                            this.linkPathInfo.linkInfo.push({
                                direction: direction,
                                nodeId: selectedNode.id,
                                nodeLabel: selectedNode.label,
                                nextNodeLabel: '',
                                color: selectedNode.color,
                                levelIndex: this.getColIndexById(selectedNode.id),
                                linkValue: '',
                                // linkRestValue: ''
                            });
                        }

                    } else {

                        if (this.getColIndexById(selectedNode.id) === lastNode.levelIndex) {
                            direction = lastNode.direction;
                            // update last
                            this.linkPathInfo.linkInfo.pop();
                            const newLast = this.linkPathInfo.linkInfo[this.linkPathInfo.linkInfo.length - 1];
                            const ids = this.linkPathInfo.linkInfo.map(item => item.nodeId);
                            ids.push(selectedNode.id);
                            const linkInfo = this.getLinkInfoByIdChain(ids);
                            newLast.linkValue = linkInfo.linkValue;
                            // newLast.linkRestValue = linkInfo.linkRestValue;
                            newLast.nextNodeLabel = selectedNode.label;

                            this.linkPathInfo.linkInfo.push({
                                direction: direction,
                                nodeId: selectedNode.id,
                                nodeLabel: selectedNode.label,
                                nextNodeLabel: '',
                                color: selectedNode.color,
                                levelIndex: this.getColIndexById(selectedNode.id),
                                linkValue: '',
                                // linkRestValue: ''
                            });

                        } else {
                            if ((lastNode.direction > 0 && this.getColIndexById(selectedNode.id) > lastNode.levelIndex)
                                || (!(lastNode.direction > 0) && !(this.getColIndexById(selectedNode.id) > lastNode.levelIndex))) {
                                direction = lastNode.direction;
                                // add new
                                const ids = this.linkPathInfo.linkInfo.map(item => item.nodeId);
                                ids.push(selectedNode.id);
                                const linkInfo = this.getLinkInfoByIdChain(ids);
                                lastNode.linkValue = linkInfo.linkValue;
                                // lastNode.linkRestValue = linkInfo.linkRestValue;
                                lastNode.nextNodeLabel = selectedNode.label;

                                this.linkPathInfo.linkInfo.push({
                                    direction: direction,
                                    nodeId: selectedNode.id,
                                    nodeLabel: selectedNode.label,
                                    nextNodeLabel: '',
                                    color: selectedNode.color,
                                    levelIndex: this.getColIndexById(selectedNode.id),
                                    linkValue: '',
                                    // linkRestValue: ''
                                });
                            } else {
                                direction = 0;
                                // clear and add new one
                                this.linkPathInfo.linkInfo = [];
                                this.linkPathInfo.linkInfo.push({
                                    direction: direction,
                                    nodeId: selectedNode.id,
                                    nodeLabel: selectedNode.label,
                                    nextNodeLabel: '',
                                    color: selectedNode.color,
                                    levelIndex: this.getColIndexById(selectedNode.id),
                                    linkValue: '',
                                    // linkRestValue: ''
                                });
                            }
                        }

                    }
                }

                // this.linkInfoChangeSubject.next(this.linkPathInfo);
                this.redrawLinkPath(this.linkPathInfo);

            } else {
                this.svg.selectAll('.sankeyLink').remove();

                this.linkPathInfo.linkInfo = [];
                this.selectedNodes = [];
                this.selectedNodesD3Dom.forEach(item=>{
                  item.attr('class', 'node')
                });
                this.selectedNodesD3Dom = [];
                //this.selectedNodes.push(targetNodeId);
                const linkData = this.sankeyOptions.data.links.filter(link => {
                    return link.sourceChain[0].toString() === targetNodeId;
                });
                // console.log(linkData, 'linkData');

                linkData.sort(this.compare);
                this.linkG.selectAll('.sankeyLink')
                    .data(linkData)
                    .enter().append('path')
                    .attr('class', 'sankeyLink')
                    .attr('sourceChain', (d) => {
                        return d.sourceChain[0];
                    })
                    .attr('d', this.sankey.link())
                    .style('fill', (d: any) => {
                        return d.source.color;
                    })
                    .attr('fill-opacity', (d: any) => {
                        return 0.6;
                    });
            }
            // ctrl键功能高亮

            this.selectedNodesD3Dom.forEach(targetDom => {
              targetDom.attr('class', 'node ctrl-selected');
              // .attr('stroke', 'black')
              // .attr('stroke-dasharray', '5, 5');
            })
            this.addEventForLinks();

            // for (var i = 0; i < this.columnMap.size; i++) {
            //     var isHas = this.columnMap.get(i).some((value) => {
            //         return value == targetNodeId;
            //     })
            //     if (isHas) {
            //         colIndex = i;
            //         break;
            //     }
            // }
            // this.svg.selectAll('.sankeyLink').attr('fill-opacity', 0).attr('isSourceChainHighlight',false);
            // // this.svg.selectAll('.sankeyLink').style('display', 'none');
            // // this.svg.selectAll('.sankeyLink').filter((d: Link) => {
            // //     return d.sourceChain[0].toString() == targetNodeId;
            // // }).style('display', 'block');




            // //highLight pre links
            // let linkedIds = [];
            // let tempIds = [];
            // linkedIds.push(targetNodeId);
            // tempIds.push(targetNodeId);
            // let maxCycleCount = 1;
            // for (var i = 0; i < this.columnMap.size; i++) {
            //     maxCycleCount *= this.columnMap.get(i).length;
            // }

            // for (var i = 0; i < maxCycleCount; i++) {

            //     let preNodeId = tempIds.pop();
            //     if(preNodeId){
            //         this.svg.selectAll('.sankeyLink').filter((d: Link) => {
            //             if (d.target.id == preNodeId && d.sourceChain[0].toString() == d.source.id) {
            //                 tempIds.unshift(d.source.id);
            //                 linkedIds.push(d.source.id);
            //                 return true;
            //             }
            //             return false;
            //         }).attr('fill-opacity', 0.6);

            //     }
            // }

            //  //highlight for post
            // this.svg.selectAll('.sankeyLink').attr('isSourceChainHighlight', (d: Link) => {
            //     if (d.sourceChain[0].toString() == targetNodeId) {
            //         return "true";
            //     } else {
            //         return "false";
            //     }
            // })

            // //highlight selected for pre
            // this.svg.selectAll('.sankeyLink').filter((d: Link) => {
            //     if (linkedIds.indexOf(d.target.id) && d.sourceChain[0].toString() == d.source.id) {
            //         return true;
            //     }else if(d.sourceChain[0].toString() != targetNodeId){
            //         return false;
            //     }
            // }).attr('isSourceChainHighlight',true);

            // //black unselected for pre
            // this.svg.selectAll('.sankeyLink').filter((d: Link) => {
            //     if (!(linkedIds.indexOf(d.target.id) && d.sourceChain[0].toString() == d.source.id) &&
            // d.sourceChain[0].toString() != targetNodeId) {
            //         return true;
            //     }else{
            //         return false;
            //     }
            // }).attr('isSourceChainHighlight',false);



            // this.svg.selectAll('.sankeyLink').attr('fill-opacity', (d: Link) => {
            //     let result;
            //     let preNodeId;
            //     if (d.sourceChain[0].toString() == nodeId) {
            //         result = 0.6;
            //     } else if(d.target.id == nodeId && d.sourceChain[0].toString()==d.source.id) {
            //         result = 0.6;
            //         preNodeId=d.source.id;
            //     }else{
            //         result = 0.1;
            //     }

            //     return result;
            // });


        });
        this.svg.selectAll('.node').on('mouseover', (d: Node) => {
            const currentEl = d3.select(d3.event.target);
            // console.log(d3.event);
            currentEl.attr('fill-opacity', 0.8);


            // const tipsArray = [];
            // tipsArray.push(d.label + ': ' + this.primaryNodes.filter(item => item.id === d.id)[0].value + '人');
            // let top10 = [];
            // for (let i = 0; i < d.tips.length; i++) {
            //     if (i < 10) {
            //         top10.push(d.tips[i]);
            //     } else {
            //         break;
            //     }
            // }
            // tipsArray.push(...d.tips);
            const targetValue = this.primaryNodes.filter(item => item.id === d.id)[0].value;
            this.showTooltip(d.id, targetValue, d, this.primaryNodes);


            // d3.selectAll("#sankeyTipText").append("tspan")
            //     .attr("x", 0)
            //     .attr("y", 0)
            //     .attr("dy", "1.7em")
            //     .text(d.label + ": " + this.primaryNodes.filter(item => item.id == d.id)[0].value + '人');
            // let tipsArra = d.tips.concat(d.tips).concat(d.tips).concat(d.tips).concat(d.tips).concat(d.tips).concat(d.tips);
            // tipsArra.forEach((item, i) => {
            //     d3.selectAll("#sankeyTipText").append("tspan")
            //         .attr("x", 0)
            //         .attr("y", 20 * i + 25)
            //         .attr("dy", "1.7em")
            //         .text(item);

            // })
            // d3.selectAll("#sankeyTipText tspan").attr("x", 5);

            // let dims = this.getDimensions('sankeyTipText');
            // let rectW = dims.w + 10;
            // let rectH = dims.h + 20;
            // d3.select("#sankeyTipRect")
            //     .attr("width", rectW)
            //     .attr("height", rectH);

            // d3.select('.sankeyTooltip')
            //     .transition()
            //     .duration(120)
            //     .style("opacity", 1);

        });
        this.svg.selectAll('.node').on('mousemove', (d) => {

            const mouseCoords = d3.mouse(this.svg.node());
            let xCo = mouseCoords[0] + 20;
            let yCo = mouseCoords[1] + 20;
            // let rectW = Number(d3.select("#sankeyTipRect").attr("width"));
            // let rectH = Number(d3.select("#sankeyTipRect").attr("height"));
            const rectW = Number(window.getComputedStyle(this.nodeTooltipEle).width.replace('px', ''));
            const rectH = Number(window.getComputedStyle(this.nodeTooltipEle).height.replace('px', ''));
            if (xCo + rectW > this.width) {
                xCo = mouseCoords[0] - 20 - rectW;
            }
            if (yCo + rectH > this.height) {
                // yCo = mouseCoords[1] - 20 - (yCo + rectH - this.height);
                yCo = yCo - (mouseCoords[1] + rectH - this.height);

            }
            // d3.selectAll(".sankeyTooltip")
            //     .attr("transform", (d) => {
            //         return "translate(" + xCo + "," + yCo + ")";
            //     });
            this.moveTooltip(xCo, yCo);

        });

        this.svg.selectAll('.node').on('mouseout', (d) => {
            const currentEl = d3.select(d3.event.target);
            currentEl.attr('fill-opacity', 1);
            // d3.select('.sankeyTooltip').style("opacity", 0).attr("transform", (d, i) => {
            //     return "translate(" + -500 + "," + -500 + ")";
            // });
            // d3.selectAll("#sankeyTipText tspan").remove();
            this.hiddenTooltip();
        });
    }

    private addEventForLinks() {
        this.svg.selectAll('.sankeyLink').on('mouseover', (d: Link) => {
            const currentEl = d3.select(d3.event.target);
            currentEl.attr('fill-opacity', 0.8);
            // console.log('...................linkOverStart', new Date().getTime());
            const relLinks = this.sankeyOptions.data.links.filter(link => {
                return (<Node>link.source).id === (<Node>d.source).id
                    && link.sourceChain[0] === d.sourceChain[0] && d.linkGroupIndex === link.linkGroupIndex;
            });
            // console.log('getRellinks  ', new Date().getTime());
            const ids = [];
            relLinks.forEach(link => {
                link.inpatIds.forEach(item =>{
                    ids.push(item);
                })
            });
            // console.log('getIds       ', new Date().getTime());
            // console.log(ids.length);
            const reCount = Util.getRepeatCount(ids);
            const total1 = d3.sum(relLinks, (link: Link) => {
                return link.value;
            }) - reCount;
            // console.log('getTotal1    ', new Date().getTime());
            const total2 = this.primaryNodes.filter(node => node.id === (<Node>d.source).id)[0].value;
            // console.log('getTotal2    ', new Date().getTime());
            const linkValue = d.value - Util.getRepeatCount(d.inpatIds);
            // console.log('removeRepeat ', new Date().getTime());

            const total = this.selectedNodes.length !== 2 ? total1 : total2;
            // console.log('...................linkOverEnd   ', new Date().getTime());

            d3.selectAll('#sankeyTipText').append('tspan')
                .attr('x', 0)
                .attr('y', 0)
                .attr('dy', '1.7em')
                .text((<Node>d.source).label + ' --> ' + (<Node>d.target).label);
            d3.selectAll('#sankeyTipText').append('tspan')
                .attr('x', 0)
                .attr('y', 20)
                .attr('dy', '1.7em')
                .text(`${linkValue}人 (${Math.round(linkValue * 10000 / total) / 100}%)`);

            d3.selectAll('#sankeyTipText tspan').attr('x', 5);

            const dims = Util.getDimensions('sankeyTipText');
            const rectW = dims.w + 10;
            const rectH = dims.h + 20;

            d3.select('#sankeyTipRect')
                .attr('width', rectW)
                .attr('height', rectH);
            d3.select('.sankeyTooltip')
                .transition()
                .duration(120)
                .style('opacity', 1);

            // console.log('addDom       ', new Date().getTime());

            currentEl.on('mousemove', (_d) => {
                const mouseCoords = d3.mouse(this.svg.node());
                let xCo = mouseCoords[0] + 10;
                let yCo = mouseCoords[1] + 10;
                const rectW = Number(d3.select('#sankeyTipRect').attr('width'));
                const rectH = Number(d3.select('#sankeyTipRect').attr('height'));
                if (xCo + rectW > this.width) {
                    xCo = mouseCoords[0] - 10 - rectW;
                }
                if (yCo + rectH > this.height) {
                    yCo = mouseCoords[1] - 10 - (yCo + rectH - this.height);
                }
                d3.selectAll('.sankeyTooltip')
                    .attr('transform', (d) => {
                        return 'translate(' + xCo + ',' + yCo + ')';
                    });
            });
        });
        this.svg.selectAll('.sankeyLink').on('mouseout', (d) => {
            const currentEl = d3.select(d3.event.target);
            currentEl.attr('fill-opacity', 0.6);
            currentEl.on('mousemove', null);

            d3.select('.sankeyTooltip').style('opacity', 0).attr('transform', (d, i) => {
                return 'translate(' + -500 + ',' + -500 + ')';
            });
            d3.selectAll('#sankeyTipText tspan').remove();
        });
    }

    private redrawLinkPath(value) {
        this.linkPathInstance.draw(value);
    }

    // 给对象排序函数
    private compare = function (obj1, obj2) {
        const val1 = obj1.dy;
        const val2 = obj2.dy;
        if (val1 < val2) {
            return 1;
        } else if (val1 > val2) {
            return -1;
        } else {
            return 0;
        }
    };

    private getLinkInfoByIdChain(chain: string[]) {
        //获取相关的link
        const linkValueObj = this.getLinkValueByIdChain(chain);
        const noLastChain = chain.filter((item, index) => index < chain.length - 1);
        const totalValueObj = this.getLinkValueByIdChain(noLastChain);
        const linkValue = linkValueObj.linkValue - Util.getRepeatCount(linkValueObj.allIds);
        const totalValue = totalValueObj.linkValue - Util.getRepeatCount(totalValueObj.allIds);

        const percent = (totalValue === 0 ? 0 : _.round(linkValue * 100 / totalValue, 2));

        /**********注释第一级反向link数据 ********/
        // let linkRestValue = '';
        // if (this.getColIndexById(chain[chain.length - 2]) === 0 && this.getColIndexById(chain[chain.length - 1]) === 1) {

        //     const drugCol = this.columnMap.get(1);
        //     let relLinksValue = 0;
        //     let allIds = [];
        //     for (let i = 0; i < drugCol.length; i++) {
        //         const index = drugCol[i].indexOf(chain[chain.length - 1]);
        //         if (index > -1) {
        //             const postIndex = index + chain[chain.length - 1].length;
        //             if ((drugCol[i].charAt(index - 1) === '+' || drugCol[i].charAt(index - 1) === '')
        //                 && (drugCol[i].charAt(postIndex) == '+' || drugCol[i].charAt(index - 1) === '')) {
        //                 const linkObj = this.getLinkValueByIdChain([chain[chain.length - 2], drugCol[i]]);
        //                 relLinksValue = relLinksValue + linkObj.linkValue;
        //                 linkObj.allIds.forEach(item=>{
        //                     allIds.push(item);
        //                 })
        //             }
        //         }
        //     }
        //     relLinksValue = relLinksValue - Util.getRepeatCount(allIds);
        //     linkRestValue = `${totalValue - relLinksValue}人（${_.round((100 - relLinksValue * 100 / totalValue), 2)}%）`;
        // }
        return {
            linkValue: `${linkValue}人（${percent}%）`,
            // linkRestValue: linkRestValue
        };
    }

    private getLinkValueByIdChain(chain: string[]) {
        const links = this.primaryLinks.filter(link => {
            let flag = true;
            for (let i = 0; i < chain.length; i++) {
                if (link.sourceChain.indexOf(chain[i]) === -1) {
                    flag = false;
                    break;
                }
            }
            return flag;
        });
        let linkValue = d3.sum(links, d => d.value);
        const allIds = [];
        links.forEach(link => {
            link.inpatIds.forEach(item=>{
                allIds.push(item);
            })
        });
        linkValue = linkValue;
        return {
            linkValue: linkValue,
            allIds: allIds
        };
    }

    private showTooltip(targetId: string, targetValue: number, targetNode: Node, primaryNodes: Node[]) {
        if (_.isFunction(this.sankeyOptions.nodeTooltipFormatter)) {
            this.nodeTooltipEle.style.setProperty('display', 'block');
            while (this.nodeTooltipEle.firstChild) {
                this.nodeTooltipEle.removeChild(this.nodeTooltipEle.firstChild);
            }
            this.nodeTooltipEle.innerHTML = this.sankeyOptions.nodeTooltipFormatter(targetId, targetValue, targetNode, primaryNodes);
        } else {
            const tipsArray = [];
            tipsArray.push(targetNode.label + ': ' + primaryNodes.filter(item => item.id === targetId)[0].value + '人');
            targetNode.tips.forEach(item =>{
                tipsArray.push(item);
            })

            const ulDom = document.createElement('ul');
            ulDom.setAttribute('class', 'sankeyTooptipUl');
            ulDom.setAttribute('style', `
            padding: 0;
            margin: 0;
            list-style: none;
            position: relative;
            `)
            tipsArray.forEach(tip => {
                const liDom = document.createElement('li');
                liDom.setAttribute('class', 'sankeyTooptipLi');
                liDom.setAttribute('style', `
                    display: block;
                    overflow: hidden;
                    line-height: 20px;
                    font-size: 12px;
                    color: white;
                    font-family: PingFangSC;
                `)

                const leftDiv = document.createElement('div');
                leftDiv.setAttribute('class', 'sankeyTooptipLiLeftDiv');
                leftDiv.setAttribute('style', `
                float: left;
                `)

                const rightDiv = document.createElement('div');
                rightDiv.setAttribute('class', 'sankeyTooptipLiRightDiv');
                rightDiv.setAttribute('style', `
                text-align: end;
                float: right;
                `)

                leftDiv.innerHTML = tip.split(':')[0] + ':&nbsp;';
                rightDiv.innerHTML = tip.split(':')[1];
                liDom.appendChild(leftDiv);
                liDom.appendChild(rightDiv);
                ulDom.appendChild(liDom);
            });
            this.nodeTooltipEle.style.setProperty('display', 'block');
            while (this.nodeTooltipEle.firstChild) {
                this.nodeTooltipEle.removeChild(this.nodeTooltipEle.firstChild);
            }
            this.nodeTooltipEle.appendChild(ulDom);
        }

    }
    private moveTooltip(left: number, top: number) {
        this.nodeTooltipEle.style.setProperty('top', top + 'px');
        this.nodeTooltipEle.style.setProperty('left', left + 'px');
    }
    private hiddenTooltip() {
        while (this.nodeTooltipEle.firstChild) {
            this.nodeTooltipEle.removeChild(this.nodeTooltipEle.firstChild);
        }
        this.nodeTooltipEle.style.setProperty('display', 'none');
    }

    private getNodeById(id): Node {
        let result: Node;
        for (let i = 0; i < this.sankeyOptions.data.columns.length; i++) {
            let node: Node[] = [];
            node = this.sankeyOptions.data.columns[i].filter(node => node.id === id);
            if (node.length > 0) {
                result = node[0];
                break;
            }
        }
        return result;
    }
    private getColIndexById(nodeId: string): number {
        let result = -1;
        this.columnMap.forEach((item, key) => {
            if (item.indexOf(nodeId) > -1) {
                result = key;
            }
        });
        return result;
    }
}