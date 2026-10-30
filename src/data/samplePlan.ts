export const SAMPLE_SQLPLAN_XML = `<?xml version="1.0" encoding="utf-8"?>
<ShowPlanXML xmlns="http://schemas.microsoft.com/sqlserver/2004/07/showplan" Version="1.5" Build="16.0.4085.2">
  <BatchSequence>
    <Batch>
      <Statements>
        <StmtSimple StatementText="SELECT c.CustomerName, o.OrderDate, o.TotalAmount, p.ProductName, s.SupplierName&#xD;&#xA;FROM Sales.Orders o&#xD;&#xA;INNER JOIN Sales.Customers c ON o.CustomerId = c.CustomerId&#xD;&#xA;INNER JOIN Sales.OrderLines ol ON o.OrderId = ol.OrderId&#xD;&#xA;INNER JOIN Production.Products p ON ol.ProductId = p.ProductId&#xD;&#xA;LEFT JOIN Purchasing.Suppliers s ON p.SupplierId = s.SupplierId&#xD;&#xA;WHERE c.NationalCode = @NationalCode AND o.OrderDate >= '2023-01-01'&#xD;&#xA;ORDER BY o.TotalAmount DESC;" StatementId="1" StatementCompId="1" StatementType="SELECT" StatementSubTreeCost="42.8521" StatementOptmLevel="FULL">
          <QueryPlan DegreeOfParallelism="4" MemoryGrant="65536" MaxUsedMemory="65536">
            <RelOp NodeId="0" PhysicalOp="Sort" LogicalOp="Top N Sort" EstimateRows="100" EstimateIO="0.0112" EstimateCPU="0.0543" EstimatedTotalSubtreeCost="42.8521" Parallel="0">
              <OutputList>
                <ColumnReference Table="[c]" Column="CustomerName" />
                <ColumnReference Table="[o]" Column="OrderDate" />
                <ColumnReference Table="[o]" Column="TotalAmount" />
                <ColumnReference Table="[p]" Column="ProductName" />
                <ColumnReference Table="[s]" Column="SupplierName" />
              </OutputList>
              <RunTimeInformation>
                <RunTimeCountersPerThread Thread="0" ActualRows="100" ActualRowsRead="450000" ActualExecutions="1" ActualCPU="125000" ActualElapsed="142000" ActualLogicalReads="120" ActualPhysicalReads="0" />
              </RunTimeInformation>
              <Sort>
                <OrderBy>
                  <OrderByColumn Ascending="0">
                    <ColumnReference Table="[o]" Column="TotalAmount" />
                  </OrderByColumn>
                </OrderBy>
                <RelOp NodeId="1" PhysicalOp="Parallelism" LogicalOp="Gather Streams" EstimateRows="450000" EstimateIO="0" EstimateCPU="0.125" EstimatedTotalSubtreeCost="42.7866" Parallel="1">
                  <OutputList>
                    <ColumnReference Table="[c]" Column="CustomerName" />
                    <ColumnReference Table="[o]" Column="OrderDate" />
                    <ColumnReference Table="[o]" Column="TotalAmount" />
                    <ColumnReference Table="[p]" Column="ProductName" />
                    <ColumnReference Table="[s]" Column="SupplierName" />
                  </OutputList>
                  <RunTimeInformation>
                    <RunTimeCountersPerThread Thread="0" ActualRows="450000" ActualRowsRead="450000" ActualExecutions="1" ActualCPU="18500" ActualElapsed="22000" ActualLogicalReads="0" ActualPhysicalReads="0" />
                  </RunTimeInformation>
                  <Parallelism>
                    <RelOp NodeId="2" PhysicalOp="Hash Match" LogicalOp="Inner Join" EstimateRows="100" EstimateIO="0" EstimateCPU="4.852" EstimatedTotalSubtreeCost="42.6616" Parallel="1">
                      <OutputList>
                        <ColumnReference Table="[c]" Column="CustomerName" />
                        <ColumnReference Table="[o]" Column="OrderDate" />
                        <ColumnReference Table="[o]" Column="TotalAmount" />
                        <ColumnReference Table="[p]" Column="ProductName" />
                        <ColumnReference Table="[s]" Column="SupplierName" />
                      </OutputList>
                      <Warnings>
                        <SpillToTempDb SpillLevel="1" SpilledThreadCount="4" />
                      </Warnings>
                      <RunTimeInformation>
                        <RunTimeCountersPerThread Thread="1" ActualRows="380000" ActualRowsRead="380000" ActualExecutions="1" ActualCPU="850000" ActualElapsed="920000" ActualLogicalReads="8420" ActualPhysicalReads="410" />
                        <RunTimeCountersPerThread Thread="2" ActualRows="35000" ActualRowsRead="35000" ActualExecutions="1" ActualCPU="110000" ActualElapsed="125000" ActualLogicalReads="1100" ActualPhysicalReads="45" />
                        <RunTimeCountersPerThread Thread="3" ActualRows="22000" ActualRowsRead="22000" ActualExecutions="1" ActualCPU="85000" ActualElapsed="95000" ActualLogicalReads="750" ActualPhysicalReads="30" />
                        <RunTimeCountersPerThread Thread="4" ActualRows="13000" ActualRowsRead="13000" ActualExecutions="1" ActualCPU="55000" ActualElapsed="65000" ActualLogicalReads="420" ActualPhysicalReads="15" />
                      </RunTimeInformation>
                      <Hash>
                        <HashKeysBuild>
                          <ColumnReference Table="[c]" Column="CustomerId" />
                        </HashKeysBuild>
                        <HashKeysProbe>
                          <ColumnReference Table="[o]" Column="CustomerId" />
                        </HashKeysProbe>
                        <!-- Child 1 of Hash Match (Build): Scan with Implicit Convert -->
                        <RelOp NodeId="3" PhysicalOp="Clustered Index Scan" LogicalOp="Clustered Index Scan" EstimateRows="100" EstimateIO="1.45" EstimateCPU="0.082" EstimatedTotalSubtreeCost="1.532" Parallel="1">
                          <OutputList>
                            <ColumnReference Table="[c]" Column="CustomerId" />
                            <ColumnReference Table="[c]" Column="CustomerName" />
                          </OutputList>
                          <Warnings>
                            <PlanAffectingConvert ConvertIssue="SeekPlan" Expression="CONVERT_IMPLICIT(nvarchar(50),[c].[NationalCode],0)" />
                          </Warnings>
                          <RunTimeInformation>
                            <RunTimeCountersPerThread Thread="1" ActualRows="450000" ActualRowsRead="1200000" ActualExecutions="1" ActualCPU="680000" ActualElapsed="750000" ActualLogicalReads="38500" ActualPhysicalReads="1200" />
                            <RunTimeCountersPerThread Thread="2" ActualRows="0" ActualRowsRead="0" ActualExecutions="1" ActualCPU="0" ActualElapsed="0" ActualLogicalReads="0" ActualPhysicalReads="0" />
                            <RunTimeCountersPerThread Thread="3" ActualRows="0" ActualRowsRead="0" ActualExecutions="1" ActualCPU="0" ActualElapsed="0" ActualLogicalReads="0" ActualPhysicalReads="0" />
                            <RunTimeCountersPerThread Thread="4" ActualRows="0" ActualRowsRead="0" ActualExecutions="1" ActualCPU="0" ActualElapsed="0" ActualLogicalReads="0" ActualPhysicalReads="0" />
                          </RunTimeInformation>
                          <IndexScan Lookup="0">
                            <Object Database="[WideWorldImporters]" Schema="[Sales]" Table="[Customers]" Index="[PK_Sales_Customers]" Alias="[c]" Storage="RowStore" />
                            <Predicate>
                              <ScalarOperator ScalarString="CONVERT_IMPLICIT(nvarchar(50),[c].[NationalCode],0)=[@NationalCode]" />
                            </Predicate>
                          </IndexScan>
                        </RelOp>
                        <!-- Child 2 of Hash Match (Probe): Nested Loops with Excessive Key Lookup -->
                        <RelOp NodeId="4" PhysicalOp="Nested Loops" LogicalOp="Inner Join" EstimateRows="120000" EstimateIO="0" EstimateCPU="3.21" EstimatedTotalSubtreeCost="36.27" Parallel="1">
                          <OutputList>
                            <ColumnReference Table="[o]" Column="CustomerId" />
                            <ColumnReference Table="[o]" Column="OrderDate" />
                            <ColumnReference Table="[o]" Column="TotalAmount" />
                            <ColumnReference Table="[p]" Column="ProductName" />
                            <ColumnReference Table="[s]" Column="SupplierName" />
                          </OutputList>
                          <RunTimeInformation>
                            <RunTimeCountersPerThread Thread="1" ActualRows="450000" ActualRowsRead="450000" ActualExecutions="1" ActualCPU="420000" ActualElapsed="460000" ActualLogicalReads="150" ActualPhysicalReads="0" />
                          </RunTimeInformation>
                          <NestedLoops>
                            <!-- Outer Input: OrderLines + Products Join -->
                            <RelOp NodeId="5" PhysicalOp="Nested Loops" LogicalOp="Inner Join" EstimateRows="120000" EstimateIO="0" EstimateCPU="2.15" EstimatedTotalSubtreeCost="22.10" Parallel="1">
                              <OutputList>
                                <ColumnReference Table="[o]" Column="CustomerId" />
                                <ColumnReference Table="[o]" Column="OrderDate" />
                                <ColumnReference Table="[o]" Column="TotalAmount" />
                                <ColumnReference Table="[p]" Column="ProductName" />
                                <ColumnReference Table="[s]" Column="SupplierName" />
                              </OutputList>
                              <RunTimeInformation>
                                <RunTimeCountersPerThread Thread="1" ActualRows="450000" ActualRowsRead="450000" ActualExecutions="1" ActualCPU="310000" ActualElapsed="340000" ActualLogicalReads="90" ActualPhysicalReads="0" />
                              </RunTimeInformation>
                              <NestedLoops>
                                <!-- Left branch: Non-clustered Index Seek on Orders -->
                                <RelOp NodeId="6" PhysicalOp="Index Seek" LogicalOp="Index Seek" EstimateRows="120000" EstimateIO="0.32" EstimateCPU="0.14" EstimatedTotalSubtreeCost="0.46" Parallel="1">
                                  <OutputList>
                                    <ColumnReference Table="[o]" Column="OrderId" />
                                    <ColumnReference Table="[o]" Column="OrderDate" />
                                  </OutputList>
                                  <RunTimeInformation>
                                    <RunTimeCountersPerThread Thread="1" ActualRows="120000" ActualRowsRead="120000" ActualExecutions="1" ActualCPU="45000" ActualElapsed="52000" ActualLogicalReads="1840" ActualPhysicalReads="12" />
                                  </RunTimeInformation>
                                  <IndexScan Lookup="0">
                                    <Object Database="[WideWorldImporters]" Schema="[Sales]" Table="[Orders]" Index="[IX_Sales_Orders_OrderDate]" Alias="[o]" Storage="RowStore" />
                                    <SeekPredicates>
                                      <SeekKeys>
                                        <StartRange>
                                          <ScalarOperator ScalarString="[o].[OrderDate] >= '2023-01-01'" />
                                        </StartRange>
                                      </SeekKeys>
                                    </SeekPredicates>
                                  </IndexScan>
                                </RelOp>
                                <!-- Right branch: Excessive Key Lookup on Orders -->
                                <RelOp NodeId="7" PhysicalOp="Clustered Index Seek" LogicalOp="Key Lookup" EstimateRows="1" EstimateIO="0.003125" EstimateCPU="0.000158" EstimatedTotalSubtreeCost="18.9" Parallel="1">
                                  <OutputList>
                                    <ColumnReference Table="[o]" Column="CustomerId" />
                                    <ColumnReference Table="[o]" Column="TotalAmount" />
                                  </OutputList>
                                  <RunTimeInformation>
                                    <RunTimeCountersPerThread Thread="1" ActualRows="120000" ActualRowsRead="120000" ActualExecutions="120000" ActualCPU="1120000" ActualElapsed="1350000" ActualLogicalReads="362000" ActualPhysicalReads="890" />
                                  </RunTimeInformation>
                                  <IndexScan Lookup="1">
                                    <Object Database="[WideWorldImporters]" Schema="[Sales]" Table="[Orders]" Index="[PK_Sales_Orders]" Alias="[o]" Storage="RowStore" />
                                    <SeekPredicates>
                                      <SeekKeys>
                                        <Prefix>
                                          <ScalarOperator ScalarString="[o].[OrderId] = [o].[OrderId]" />
                                        </Prefix>
                                      </SeekKeys>
                                    </SeekPredicates>
                                  </IndexScan>
                                </RelOp>
                              </NestedLoops>
                            </RelOp>
                            <!-- Right Input: Products & Suppliers join (Healthy Subtree for auto-collapse demo) -->
                            <RelOp NodeId="8" PhysicalOp="Nested Loops" LogicalOp="Left Outer Join" EstimateRows="1" EstimateIO="0" EstimateCPU="0.0001" EstimatedTotalSubtreeCost="0.0062" Parallel="0">
                              <OutputList>
                                <ColumnReference Table="[p]" Column="ProductName" />
                                <ColumnReference Table="[s]" Column="SupplierName" />
                              </OutputList>
                              <RunTimeInformation>
                                <RunTimeCountersPerThread Thread="0" ActualRows="1" ActualRowsRead="1" ActualExecutions="450000" ActualCPU="12000" ActualElapsed="14000" ActualLogicalReads="240" ActualPhysicalReads="0" />
                              </RunTimeInformation>
                              <NestedLoops>
                                <!-- Child 8.1: Clustered Index Seek on Products -->
                                <RelOp NodeId="9" PhysicalOp="Clustered Index Seek" LogicalOp="Clustered Index Seek" EstimateRows="1" EstimateIO="0.003125" EstimateCPU="0.000158" EstimatedTotalSubtreeCost="0.0032" Parallel="0">
                                  <OutputList>
                                    <ColumnReference Table="[p]" Column="ProductId" />
                                    <ColumnReference Table="[p]" Column="ProductName" />
                                    <ColumnReference Table="[p]" Column="SupplierId" />
                                  </OutputList>
                                  <RunTimeInformation>
                                    <RunTimeCountersPerThread Thread="0" ActualRows="1" ActualRowsRead="1" ActualExecutions="450000" ActualCPU="5000" ActualElapsed="6000" ActualLogicalReads="110" ActualPhysicalReads="0" />
                                  </RunTimeInformation>
                                  <IndexScan Lookup="0">
                                    <Object Database="[WideWorldImporters]" Schema="[Production]" Table="[Products]" Index="[PK_Production_Products]" Alias="[p]" Storage="RowStore" />
                                  </IndexScan>
                                </RelOp>
                                <!-- Child 8.2: Clustered Index Seek on Suppliers -->
                                <RelOp NodeId="10" PhysicalOp="Clustered Index Seek" LogicalOp="Clustered Index Seek" EstimateRows="1" EstimateIO="0.003125" EstimateCPU="0.000158" EstimatedTotalSubtreeCost="0.0030" Parallel="0">
                                  <OutputList>
                                    <ColumnReference Table="[s]" Column="SupplierId" />
                                    <ColumnReference Table="[s]" Column="SupplierName" />
                                  </OutputList>
                                  <RunTimeInformation>
                                    <RunTimeCountersPerThread Thread="0" ActualRows="1" ActualRowsRead="1" ActualExecutions="450000" ActualCPU="4000" ActualElapsed="5000" ActualLogicalReads="90" ActualPhysicalReads="0" />
                                  </RunTimeInformation>
                                  <IndexScan Lookup="0">
                                    <Object Database="[WideWorldImporters]" Schema="[Purchasing]" Table="[Suppliers]" Index="[PK_Purchasing_Suppliers]" Alias="[s]" Storage="RowStore" />
                                  </IndexScan>
                                </RelOp>
                              </NestedLoops>
                            </RelOp>
                          </NestedLoops>
                        </RelOp>
                      </Hash>
                    </RelOp>
                  </Parallelism>
                </RelOp>
              </Sort>
            </RelOp>
          </QueryPlan>
        </StmtSimple>
      </Statements>
    </Batch>
  </BatchSequence>
</ShowPlanXML>`;
